const DAY_IN_MS = 24 * 60 * 60 * 1000

function getDayRange(now = Date.now()) {
  const startDate = new Date(now)
  startDate.setHours(0, 0, 0, 0)

  const startTime = startDate.getTime()

  return {
    startTime,
    endTime: startTime + DAY_IN_MS,
  }
}

async function appendPointsLog(pointsLogCollection, record, now = Date.now()) {
  return pointsLogCollection.add({
    ...record,
    create_time:
      typeof record.create_time === 'number' ? record.create_time : now,
  })
}

// 用户字段增量更新在多个云对象里都会出现，统一封装后可以避免 update_time 和 inc 写法漂移。
async function incrementUserFields(
  usersCollection,
  dbCmd,
  userId,
  increments = {},
  extraData = {},
) {
  const updateData = {
    ...extraData,
  }

  for (const [field, rawAmount] of Object.entries(increments)) {
    const amount = Number(rawAmount || 0)
    if (!amount) {
      continue
    }

    updateData[field] = dbCmd.inc(amount)
  }

  if (!('update_time' in updateData)) {
    updateData.update_time = Date.now()
  }

  return usersCollection.doc(userId).update(updateData)
}

async function getUserById(usersCollection, userId) {
  const userRes = await usersCollection.doc(userId).get()
  return userRes.data[0] || null
}

async function incrementUserFieldsAndGetUser(
  usersCollection,
  dbCmd,
  userId,
  increments = {},
  extraData = {},
) {
  await incrementUserFields(usersCollection, dbCmd, userId, increments, extraData)
  return getUserById(usersCollection, userId)
}

function buildPagedData(list, total, page, pageSize, extra = {}) {
  return {
    list,
    total,
    page,
    pageSize,
    ...extra,
  }
}

module.exports = {
  DAY_IN_MS,
  appendPointsLog,
  buildPagedData,
  getUserById,
  getDayRange,
  incrementUserFields,
  incrementUserFieldsAndGetUser,
}
