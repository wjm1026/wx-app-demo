// 用户中心云对象
const crypto = require('crypto')
const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const inviteTaskConfigsCollection = db.collection('invite_task_configs')
const pointsLogCollection = db.collection('points_log')
const achievementsCollection = db.collection('user_achievements')
const { createToken, getAuthUserContext, stripAuthParams } = require('custom-auth')
const {
  appendPointsLog,
  buildPagedData,
  getInviteTaskConfigByKey,
  incrementUserFieldsAndGetUser,
  isDuplicateRecordError,
  loadInviteTaskConfigs,
  unlockAchievementsForStats,
} = require('cloud-shared')
const INVITE_BIND_WINDOW_MS = 24 * 60 * 60 * 1000
const REGISTRATION_REWARD = 100
const INVITEE_REWARD = 50
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// 生成邀请码
function generateInviteCode() {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARS.length))
  }
  return code
}

/** 构建确定性用户ID */
function buildDeterministicUserId(openid) {
  const digest = crypto.createHash('sha1').update(String(openid || '')).digest('hex')
  return `user:wx:${digest}`
}

/** 从种子构建邀请码 */
function buildInviteCodeFromSeed(seed) {
  const digest = crypto.createHash('sha1').update(String(seed || '')).digest()
  let code = ''

  for (let i = 0; i < 6; i += 1) {
    code += INVITE_CODE_CHARS[digest[i] % INVITE_CODE_CHARS.length]
  }

  return code
}

/** 规范化邀请码 */
function normalizeInviteCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

/** 获取邀请绑定截止时间 */
function getInviteBindDeadline(user) {
  const createTime = Number(user?.create_time || 0)
  return createTime > 0 ? createTime + INVITE_BIND_WINDOW_MS : 0
}

/** 判断是否可以绑定邀请码 */
function canBindInviteCode(user, now = Date.now()) {
  if (!user || user.inviter_id) {
    return false
  }

  const deadline = getInviteBindDeadline(user)
  if (!deadline) {
    return false
  }

  return now <= deadline
}

/** 创建唯一邀请码 */
async function createUniqueInviteCode(seed) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = buildInviteCodeFromSeed(`${seed}:${attempt}`)
    const existingRes = await usersCollection
      .where({ invite_code: inviteCode })
      .field({ _id: true })
      .limit(1)
      .get()

    if (existingRes.data.length === 0) {
      return inviteCode
    }
  }

  return generateInviteCode()
}

/** 构建新用户 */
async function buildNewUser(openid, unionid, inviter) {
  const now = Date.now()
  const points = REGISTRATION_REWARD + (inviter ? INVITEE_REWARD : 0)
  const userId = buildDeterministicUserId(openid)
  const inviteCode = await createUniqueInviteCode(userId)

  return {
    _id: userId,
    openid,
    unionid: unionid || '',
    nickname: '宝宝' + Math.floor(Math.random() * 10000),
    avatar: '',
    gender: 0,
    points,
    free_views: 10,
    invite_code: inviteCode,
    invite_count: 0,
    last_sign_in_day: 0,
    is_vip: false,
    role: 'user',
    status: 1,
    create_time: now,
    last_login_time: now,
    ...(inviter ? { inviter_id: inviter._id } : {}),
  }
}

/** 按编码查找邀请人 */
async function findInviterByCode(inviteCode) {
  if (!inviteCode) {
    return null
  }

  const inviterRes = await usersCollection.where({ invite_code: inviteCode }).get()
  return inviterRes.data[0] || null
}

/** 解析邀请人奖励 */
function resolveInviterReward(taskConfigs) {
  const shareTask = getInviteTaskConfigByKey(taskConfigs, 'share-friend')
  const reward = Number(shareTask?.points)
  return Number.isFinite(reward) ? reward : 100
}

/** 检查邀请成就列表 */
async function checkInviteAchievements(uid, inviteCount) {
  return unlockAchievementsForStats({
    uid,
    stats: {
      invites: Number(inviteCount || 0),
    },
    types: ['invites'],
    usersCollection,
    achievementsCollection,
    pointsLogCollection,
    dbCmd,
  })
}

/** 为邀请人发放注册 */
async function rewardInviterForRegistration(inviter, inviteeId, inviterReward) {
  if (!inviter) {
    return
  }

  const updatedInviter = await incrementUserFieldsAndGetUser(
    usersCollection,
    dbCmd,
    inviter._id,
    {
      points: inviterReward,
      invite_count: 1,
    },
  )

  await appendPointsLog(pointsLogCollection, {
    user_id: inviter._id,
    type: 'invite',
    amount: inviterReward,
    balance: Number(updatedInviter?.points || 0),
    description: '邀请新用户奖励',
    related_id: inviteeId,
  })

  await checkInviteAchievements(inviter._id, updatedInviter?.invite_count)
}

/** 记录注册礼包 */
async function recordRegistrationGift(userId, points) {
  await appendPointsLog(pointsLogCollection, {
    user_id: userId,
    type: 'gift',
    amount: points,
    balance: points,
    description: '新用户注册奖励',
  })
}

/** 更新现有用户 */
async function touchExistingUser(userId, existingUser = {}) {
  const updateData = {
    last_login_time: Date.now(),
  }

  if (typeof existingUser.status !== 'number') {
    updateData.status = 1
  }

  if (!existingUser.role) {
    updateData.role = 'user'
  }

  await usersCollection.doc(userId).update(updateData)
}

module.exports = {
  // 微信登录
  async loginByWeixin(params) {
    const { code, inviteCode } = stripAuthParams(params)
    const normalizedInviteCode = normalizeInviteCode(inviteCode)
    
    // 调用微信接口获取openid
    const res = await uniCloud.httpclient.request(
      'https://api.weixin.qq.com/sns/jscode2session',
      {
        method: 'GET',
        data: {
          appid: 'wxb0ec6c6b3b812153', // 需要配置为当前发布小程序的 AppID
          secret: 'b532f4416c9449591b7095e1b718b133', // 需要同步替换为当前 AppID 对应的 AppSecret
          js_code: code,
          grant_type: 'authorization_code'
        },
        dataType: 'json'
      }
    )

    if (res.data.errcode) {
      return {
        code: 500,
        msg: '微信登录失败: ' + res.data.errmsg
      }
    }

    const { openid, unionid, session_key } = res.data

    // 查询用户是否存在
    let userRes = await usersCollection.where({ openid }).get()
    let userId
    let isNewUser = false

    if (userRes.data.length === 0) {
      // 新用户注册
      isNewUser = true
      const taskConfigs = await loadInviteTaskConfigs(inviteTaskConfigsCollection)
      const inviterReward = resolveInviterReward(taskConfigs)
      const inviter = await findInviterByCode(normalizedInviteCode)
      const newUser = await buildNewUser(openid, unionid, inviter)

      try {
        const addRes = await usersCollection.add(newUser)
        userId = addRes.id || newUser._id

        await rewardInviterForRegistration(inviter, userId, inviterReward)
        await recordRegistrationGift(userId, newUser.points)
      } catch (error) {
        if (!isDuplicateRecordError(error)) {
          throw error
        }

        const existingUserRes = await usersCollection.doc(newUser._id).get()
        const existingUser = existingUserRes.data[0] || null

        if (!existingUser) {
          throw error
        }

        userId = existingUser._id
        isNewUser = false
        await touchExistingUser(userId, existingUser)
      }
    } else {
      // 老用户更新登录时间
      const existingUser = userRes.data[0] || {}
      userId = existingUser._id
      await touchExistingUser(userId, existingUser)
    }

    // 获取用户信息
    const user = await usersCollection.doc(userId).get()

    // 生成token
    const currentUser = user.data[0] || {}
    const tokenRes = createToken({
      uid: userId,
      role: currentUser.role || 'user',
    })

    return {
      code: 0,
      msg: 'success',
      data: {
        userId,
        userInfo: currentUser,
        isNewUser,
        token: tokenRes.token,
        tokenExpired: tokenRes.tokenExpired
      }
    }
  },

  // 获取用户信息
  async getUserInfo(params) {
    const authResult = await getAuthUserContext(params, { message: '未登录' })
    if (!authResult.ok) {
      return authResult.response
    }

    return {
      code: 0,
      msg: 'success',
      data: authResult.user
    }
  },

  // 更新用户信息
  async updateUserInfo(params) {
    const authResult = await getAuthUserContext(params, { message: '未登录' })
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const { nickname, avatar, gender } = authResult.params
    const updateData = { update_time: Date.now() }

    if (nickname) updateData.nickname = nickname
    if (avatar) updateData.avatar = avatar
    if (typeof gender === 'number') updateData.gender = gender

    await usersCollection.doc(uid).update(updateData)

    return { code: 0, msg: '更新成功' }
  },

  // 登录后补绑邀请码
  async bindInviteCode(params) {
    const authResult = await getAuthUserContext(params, { message: '未登录' })
    if (!authResult.ok) {
      return authResult.response
    }

    const { uid } = authResult.auth
    const user = authResult.user
    const inviteCode = normalizeInviteCode(authResult.params?.inviteCode)

    if (!inviteCode) {
      return { code: 400, msg: '请输入邀请码' }
    }

    if (!/^[A-Z0-9]{6}$/.test(inviteCode)) {
      return { code: 400, msg: '邀请码格式不正确' }
    }

    if (!canBindInviteCode(user)) {
      return { code: 400, msg: '当前账号已不能再绑定邀请码' }
    }

    if (inviteCode === normalizeInviteCode(user.invite_code)) {
      return { code: 400, msg: '不能填写自己的邀请码' }
    }

    const inviter = await findInviterByCode(inviteCode)
    if (!inviter) {
      return { code: 404, msg: '邀请码不存在' }
    }
    if (!inviter || inviter._id === uid) {
      return { code: 400, msg: '不能填写自己的邀请码' }
    }

    const taskConfigs = await loadInviteTaskConfigs(inviteTaskConfigsCollection)
    const inviteReward = INVITEE_REWARD
    const inviterReward = resolveInviterReward(taskConfigs)

    const updatedUser = await incrementUserFieldsAndGetUser(
      usersCollection,
      dbCmd,
      uid,
      { points: inviteReward },
      { inviter_id: inviter._id },
    )

    const updatedInviter = await incrementUserFieldsAndGetUser(
      usersCollection,
      dbCmd,
      inviter._id,
      {
        points: inviterReward,
        invite_count: 1,
      },
    )

    await appendPointsLog(pointsLogCollection, {
      user_id: uid,
      type: 'invite_bonus',
      amount: inviteReward,
      balance: Number(updatedUser?.points || 0),
      description: '填写好友邀请码奖励',
      related_id: inviter._id,
    })

    await appendPointsLog(pointsLogCollection, {
      user_id: inviter._id,
      type: 'invite',
      amount: inviterReward,
      balance: Number(updatedInviter?.points || 0),
      description: '邀请新用户奖励',
      related_id: uid,
    })

    await checkInviteAchievements(inviter._id, updatedInviter?.invite_count)

    return {
      code: 0,
      msg: '邀请码绑定成功，已获得50积分',
      data: {
        userInfo: updatedUser,
        inviterId: inviter._id,
        inviteReward,
      },
    }
  },

  // 获取积分任务配置（公开）
  async getInviteTaskConfigs() {
    const tasks = await loadInviteTaskConfigs(inviteTaskConfigsCollection)

    return {
      code: 0,
      msg: 'success',
      data: tasks,
    }
  },

  // 获取邀请信息
  async getInviteInfo(params) {
    const authResult = await getAuthUserContext(params, { message: '未登录' })
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const user = authResult.user

    // 获取邀请列表
    const invitedUsers = await usersCollection
      .where({ inviter_id: uid })
      .field({ nickname: true, avatar: true, create_time: true })
      .orderBy('create_time', 'desc')
      .limit(50)
      .get()

    return {
      code: 0,
      msg: 'success',
      data: {
        inviteCode: user.invite_code,
        inviteCount: user.invite_count,
        inviterId: user.inviter_id || '',
        canBindInviteCode: canBindInviteCode(user),
        inviteBindDeadline: getInviteBindDeadline(user),
        invitedUsers: invitedUsers.data
      }
    }
  },

  // 获取积分流水
  async getPointsLog(params) {
    const authResult = await getAuthUserContext(params, { message: '未登录' })
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const { page = 1, pageSize = 20 } = authResult.params || {}

    const [res, countRes] = await Promise.all([
      pointsLogCollection
        .where({ user_id: uid })
        .orderBy('create_time', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get(),
      pointsLogCollection.where({ user_id: uid }).count()
    ])

    return {
      code: 0,
      msg: 'success',
      data: buildPagedData(res.data, countRes.total, page, pageSize),
    }
  },
}
