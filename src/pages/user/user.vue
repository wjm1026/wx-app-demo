<template>
  <view class="page">
    <!-- 头部信息区 -->
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <!-- 装饰背景 -->
      <view class="header-decoration">
        <text class="deco-star d1">⭐</text>
        <text class="deco-star d2">✨</text>
        <text class="deco-star d3">🌟</text>
      </view>
      
      <!-- 用户信息 -->
      <view class="user-info">
        <view class="avatar-wrapper" @click="chooseAvatar">
          <image class="avatar" :src="userInfo.avatar || defaultAvatar" mode="aspectFill" />
          <view v-if="userInfo.isVip" class="vip-badge">VIP</view>
        </view>
        <view class="info-content">
          <view class="nickname-row">
            <text class="nickname">{{ userInfo.nickname || '点击登录' }}</text>
            <view v-if="userInfo.isVip" class="vip-tag">
              <text class="vip-icon">👑</text>
              <text class="vip-text">尊贵会员</text>
            </view>
          </view>
          <text class="user-id" v-if="isLoggedIn">ID: {{ userInfo.inviteCode }}</text>
        </view>
      </view>

      <!-- 统计数据 -->
      <view class="stats-card">
        <view class="stat-item" @click="goPointsLog">
          <view class="stat-icon-wrapper points">
            <text class="stat-icon">💰</text>
          </view>
          <text class="stat-value">{{ userInfo.points }}</text>
          <text class="stat-label">积分</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <view class="stat-icon-wrapper views">
            <text class="stat-icon">🎫</text>
          </view>
          <text class="stat-value">{{ userInfo.freeViews }}</text>
          <text class="stat-label">免费次数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goInvite">
          <view class="stat-icon-wrapper invite">
            <text class="stat-icon">👥</text>
          </view>
          <text class="stat-value">{{ userInfo.inviteCount }}</text>
          <text class="stat-label">邀请人数</text>
        </view>
      </view>

      <!-- 每日任务 -->
      <view class="daily-tasks">
        <view class="task-card sign-in" :class="{ completed: hasSigned }" @click="doSignIn">
          <view class="task-content">
            <text class="task-icon">{{ hasSigned ? '✅' : '📅' }}</text>
            <view class="task-info">
              <text class="task-title">{{ hasSigned ? '已签到' : '每日签到' }}</text>
              <text class="task-reward">+5 积分</text>
            </view>
          </view>
          <view class="task-arrow">→</view>
        </view>
        <view class="task-card watch-ad" @click="watchAd">
          <view class="task-content">
            <text class="task-icon">🎬</text>
            <view class="task-info">
              <text class="task-title">看视频</text>
              <text class="task-reward">+10 积分</text>
            </view>
          </view>
          <view class="task-arrow">→</view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll" :style="contentScrollStyle">
      <!-- 菜单列表 -->
      <view class="menu-section">
        <view class="menu-group">
          <view class="menu-item" @click="goFavorites">
            <view class="menu-icon-wrapper favorites">
              <text class="menu-icon">❤️</text>
            </view>
            <text class="menu-title">我的收藏</text>
            <text class="menu-arrow">→</text>
          </view>
          <view class="menu-item" @click="goAchievements">
            <view class="menu-icon-wrapper achievements">
              <text class="menu-icon">🏆</text>
            </view>
            <text class="menu-title">学习成就</text>
            <text class="menu-arrow">→</text>
          </view>
          <view class="menu-item" @click="goInvite">
            <view class="menu-icon-wrapper invite">
              <text class="menu-icon">🎁</text>
            </view>
            <text class="menu-title">邀请好友</text>
            <view class="menu-badge">+100积分</view>
            <text class="menu-arrow">→</text>
          </view>
          <view class="menu-item" @click="goPointsLog">
            <view class="menu-icon-wrapper points">
              <text class="menu-icon">📊</text>
            </view>
            <text class="menu-title">积分明细</text>
            <text class="menu-arrow">→</text>
          </view>
        </view>

        <view class="menu-group">
          <view class="menu-item" @click="goFeedback">
            <view class="menu-icon-wrapper feedback">
              <text class="menu-icon">💬</text>
            </view>
            <text class="menu-title">意见反馈</text>
            <text class="menu-arrow">→</text>
          </view>
          <view class="menu-item" @click="goAbout">
            <view class="menu-icon-wrapper about">
              <text class="menu-icon">ℹ️</text>
            </view>
            <text class="menu-title">关于我们</text>
            <text class="menu-arrow">→</text>
          </view>
          <button class="menu-item share-btn" open-type="share">
            <view class="menu-icon-wrapper share">
              <text class="menu-icon">📤</text>
            </view>
            <text class="menu-title">分享给朋友</text>
            <text class="menu-arrow">→</text>
          </button>
        </view>

        <view v-if="store.isAdmin" class="menu-group">
          <view class="menu-item" @click="goAdmin">
            <view class="menu-icon-wrapper admin">
              <text class="menu-icon">⚙️</text>
            </view>
            <text class="menu-title">管理后台</text>
            <view class="menu-badge admin-badge">管理员</view>
            <text class="menu-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 登录按钮 -->
      <view v-if="!isLoggedIn" class="login-section">
        <view class="login-btn" @click="doLogin">
          <text class="login-icon">💚</text>
          <text class="login-text">微信一键登录</text>
        </view>
        <text class="login-tip">登录后可保存学习进度和收藏</text>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom"></view>
    </scroll-view>

    <CustomTabbar :current="2" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getStatusBarHeight, navigateTo, showToast } from '@/utils'
import { userApi, pointsApi, type UserInfo } from '@/api'
import { useStore } from '@/store'
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'

const store = useStore()
const statusBarHeight = ref(getStatusBarHeight())
const hasSigned = ref(false)
const isLoading = ref(false)
const headerHeight = ref(0)

const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

// 是否已登录
const isLoggedIn = computed(() => !!store.userInfo)

// 用户信息
const userInfo = computed(() => ({
  nickname: store.userInfo?.nickname || '点击登录',
  avatar: store.userInfo?.avatar || '',
  points: store.userInfo?.points || 0,
  freeViews: store.userInfo?.free_views || 0,
  inviteCount: store.userInfo?.invite_count || 0,
  inviteCode: store.userInfo?.invite_code || '',
  isVip: store.userInfo?.is_vip || false
}))

const contentScrollStyle = computed(() => {
  const top = headerHeight.value
  return {
    marginTop: `${top}px`,
    height: `calc(100vh - ${top}px)`
  }
})

function updateHeaderHeight() {
  nextTick(() => {
    uni.createSelectorQuery()
      .select('.header')
      .boundingClientRect((rect: any) => {
        if (rect?.height) {
          headerHeight.value = rect.height
        }
      })
      .exec()
  })
}

// 初始化
onMounted(() => {
  updateHeaderHeight()
  if (isLoggedIn.value) {
    loadUserInfo()
    checkSignInStatus()
  }
})

onShow(() => {
  updateHeaderHeight()
  if (isLoggedIn.value) {
    loadUserInfo()
    checkSignInStatus()
  }
})

watch(isLoggedIn, () => {
  updateHeaderHeight()
})

// 加载用户信息
async function loadUserInfo() {
  try {
    const res = await userApi.getUserInfo()
    if (res.code === 0 && res.data) {
      store.setUserInfo(res.data)
    }
  } catch (e) {
    console.error('获取用户信息失败:', e)
  }
}

// 检查签到状态
async function checkSignInStatus() {
  try {
    const res = await pointsApi.getSignInStatus()
    if (res.code === 0) {
      hasSigned.value = res.data?.hasSigned || false
    }
  } catch (e) {
    console.error('获取签到状态失败:', e)
  }
}

// 选择头像
function chooseAvatar() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      // 这里可以上传头像到云存储，暂时只显示提示
      showToast('头像功能开发中')
    }
  })
}

// 微信登录
async function doLogin() {
  if (isLoading.value) return
  isLoading.value = true
  
  try {
    // 获取微信登录code
    const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject
      })
    })
    
    if (!loginRes.code) {
      showToast('获取登录凭证失败')
      return
    }
    
    showToast('登录中...', 'loading')
    
    // 获取邀请码（如果有）
    const inviteCode = uni.getStorageSync('INVITE_CODE') || undefined
    
    // 调用云函数登录
    const res = await userApi.loginByWeixin(loginRes.code, inviteCode)
    
    if (res.code === 0 && res.data) {
      // 保存token
      if (res.data.token) {
        store.setToken(res.data.token, res.data.tokenExpired)
      }
      
      // 保存用户信息
      store.setUserInfo(res.data.userInfo)
      
      // 清除邀请码
      uni.removeStorageSync('INVITE_CODE')
      
      uni.hideToast()
      
      if (res.data.isNewUser) {
        showToast('欢迎新用户！获得100积分 🎉', 'success')
      } else {
        showToast('登录成功 🎉', 'success')
      }
      
      // 检查签到状态
      checkSignInStatus()
    } else {
      showToast(res.msg || '登录失败')
    }
  } catch (e: any) {
    console.error('登录失败:', e)
    showToast(e.message || '登录失败，请重试')
  } finally {
    isLoading.value = false
  }
}

// 每日签到
async function doSignIn() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  
  if (hasSigned.value) {
    showToast('今日已签到 ✅')
    return
  }
  
  try {
    showToast('签到中...', 'loading')
    const res = await pointsApi.signIn()
    uni.hideToast()
    
    if (res.code === 0) {
      hasSigned.value = true
      // 刷新用户信息
      loadUserInfo()
      showToast(`签到成功 +${res.data?.earnPoints || 5}积分 🎉`, 'success')
    } else {
      showToast(res.msg || '签到失败')
    }
  } catch (e: any) {
    uni.hideToast()
    showToast(e.message || '签到失败')
  }
}

// 看广告赚积分
async function watchAd() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  
  // #ifdef MP-WEIXIN
  try {
    // 创建激励视频广告
    const videoAd = uni.createRewardedVideoAd({
      adUnitId: 'adunit-xxxxxxxxx' // 需要替换为真实的广告单元ID
    })
    
    // 监听关闭事件
    videoAd.onClose(async (status: any) => {
      if (status && status.isEnded) {
        // 广告观看完成，发放奖励
        try {
          const res = await pointsApi.earnByAd('video')
          if (res.code === 0) {
            loadUserInfo()
            showToast(`获得${res.data?.earnPoints || 10}积分 🎉`, 'success')
          }
        } catch (e) {
          console.error('积分发放失败:', e)
        }
      } else {
        showToast('请看完广告才能获得奖励')
      }
    })
    
    // 显示广告
    videoAd.show().catch(() => {
      videoAd.load().then(() => videoAd.show())
    })
  } catch (e) {
    // 广告加载失败，直接给积分（开发环境）
    console.warn('广告加载失败，开发模式直接发放积分')
    try {
      const res = await pointsApi.earnByAd('video')
      if (res.code === 0) {
        loadUserInfo()
        showToast(`获得${res.data?.earnPoints || 10}积分 🎉`, 'success')
      }
    } catch (err) {
      showToast('获取积分失败')
    }
  }
  // #endif
  
  // #ifndef MP-WEIXIN
  // 非微信环境模拟
  showToast('加载广告中...', 'loading')
  setTimeout(async () => {
    uni.hideToast()
    try {
      const res = await pointsApi.earnByAd('video')
      if (res.code === 0) {
        loadUserInfo()
        showToast(`获得${res.data?.earnPoints || 10}积分 🎉`, 'success')
      }
    } catch (e) {
      showToast('获取积分失败')
    }
  }, 2000)
  // #endif
}

function goFavorites() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  navigateTo('/pages/user/favorites')
}

function goAchievements() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  navigateTo('/pages/user/achievements')
}

function goInvite() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  navigateTo('/pages/user/invite')
}

function goPointsLog() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  navigateTo('/pages/user/points-log')
}

function goFeedback() {
  if (!uni.openCustomerServiceChat) {
    showToast('客服功能开发中')
    return
  }
  uni.openCustomerServiceChat({
    extInfo: { url: '' },
    corpId: '',
    success() {},
    fail() {
      showToast('客服功能开发中')
    }
  })
}

function goAbout() {
  showToast('关于页面开发中')
}

// 管理员入口
function goAdmin() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  navigateTo('/pages/admin/admin')
}
</script>

<style src="./user.scss" scoped lang="scss"></style>
