// 用户中心云对象
const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const pointsLogCollection = db.collection('points_log')

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

module.exports = {
  _before: function() {
    // 获取客户端信息
    this.clientInfo = this.getClientInfo()
  },

  // 微信登录
  async loginByWeixin(params) {
    const { code, inviteCode } = params
    
    // 调用微信接口获取openid
    const res = await uniCloud.httpclient.request(
      'https://api.weixin.qq.com/sns/jscode2session',
      {
        method: 'GET',
        data: {
          appid: 'wx0a25acae1d9666ee', // 需要配置
          secret: '299b6b8ca2a28c71489291ff5f8fe37b', // 需要配置
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
      const newUser = {
        openid,
        unionid: unionid || '',
        nickname: '宝宝' + Math.floor(Math.random() * 10000),
        avatar: '',
        gender: 0,
        points: 100, // 新用户赠送100积分
        free_views: 10, // 新用户免费查看10次
        invite_code: generateInviteCode(),
        invite_count: 0,
        is_vip: false,
        create_time: Date.now(),
        last_login_time: Date.now()
      }

      // 处理邀请关系
      if (inviteCode) {
        const inviterRes = await usersCollection.where({ invite_code: inviteCode }).get()
        if (inviterRes.data.length > 0) {
          newUser.inviter_id = inviterRes.data[0]._id
          newUser.points += 50 // 被邀请人额外获得50积分
          
          // 给邀请人增加积分
          const inviter = inviterRes.data[0]
          await usersCollection.doc(inviter._id).update({
            points: dbCmd.inc(100),
            invite_count: dbCmd.inc(1)
          })
          
          // 记录邀请人积分流水
          await pointsLogCollection.add({
            user_id: inviter._id,
            type: 'invite',
            amount: 100,
            balance: inviter.points + 100,
            description: '邀请新用户奖励',
            related_id: '', // 稍后更新
            create_time: Date.now()
          })
        }
      }

      const addRes = await usersCollection.add(newUser)
      userId = addRes.id

      // 记录新用户积分流水
      await pointsLogCollection.add({
        user_id: userId,
        type: 'gift',
        amount: newUser.points,
        balance: newUser.points,
        description: '新用户注册奖励',
        create_time: Date.now()
      })
    } else {
      // 老用户更新登录时间
      userId = userRes.data[0]._id
      await usersCollection.doc(userId).update({
        last_login_time: Date.now()
      })
    }

    // 获取用户信息
    const user = await usersCollection.doc(userId).get()

    // 生成token
    const tokenRes = await uniCloud.request({
      name: 'uni-id-co',
      data: {
        action: 'createToken',
        params: { uid: userId }
      }
    }).catch(() => null)

    return {
      code: 0,
      msg: 'success',
      data: {
        userId,
        userInfo: user.data[0],
        isNewUser,
        token: tokenRes?.data?.token || '',
        tokenExpired: tokenRes?.data?.tokenExpired || 0
      }
    }
  },

  // 获取用户信息
  async getUserInfo() {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '未登录' }
    }

    const res = await usersCollection.doc(uid).get()
    
    if (res.data.length === 0) {
      return { code: 404, msg: '用户不存在' }
    }

    return {
      code: 0,
      msg: 'success',
      data: res.data[0]
    }
  },

  // 更新用户信息
  async updateUserInfo(params) {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '未登录' }
    }

    const { nickname, avatar, gender } = params
    const updateData = { update_time: Date.now() }
    
    if (nickname) updateData.nickname = nickname
    if (avatar) updateData.avatar = avatar
    if (typeof gender === 'number') updateData.gender = gender

    await usersCollection.doc(uid).update(updateData)

    return { code: 0, msg: '更新成功' }
  },

  // 获取邀请信息
  async getInviteInfo() {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '未登录' }
    }

    const userRes = await usersCollection.doc(uid).get()
    const user = userRes.data[0]

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
        invitedUsers: invitedUsers.data
      }
    }
  },

  // 获取积分流水
  async getPointsLog(params) {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '未登录' }
    }

    const { page = 1, pageSize = 20 } = params || {}

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
      data: {
        list: res.data,
        total: countRes.total,
        page,
        pageSize
      }
    }
  }
}
