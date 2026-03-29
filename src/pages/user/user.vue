<template>
  <view class="page">
    <!-- 头部信息区 -->
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <!-- 装饰背景 -->
      <view class="header-decoration">
        <view class="deco-orb o1"></view>
        <view class="deco-orb o2"></view>
        <view class="deco-orb o3"></view>
      </view>

      <!-- 用户信息 -->
      <view class="user-info">
        <!-- #ifdef MP-WEIXIN -->
        <button
          v-if="isLoggedIn"
          class="avatar-wrapper avatar-button"
          open-type="chooseAvatar"
          @chooseavatar="handleChooseAvatar"
        >
          <image
            class="avatar"
            :src="userInfo.avatar || defaultAvatar"
            mode="aspectFill"
          />
          <view v-if="userInfo.isVip" class="vip-badge">VIP</view>
        </button>
        <view v-else class="avatar-wrapper" @click="chooseAvatar">
          <image
            class="avatar"
            :src="userInfo.avatar || defaultAvatar"
            mode="aspectFill"
          />
          <view v-if="userInfo.isVip" class="vip-badge">VIP</view>
        </view>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <view class="avatar-wrapper" @click="chooseAvatar">
          <image
            class="avatar"
            :src="userInfo.avatar || defaultAvatar"
            mode="aspectFill"
          />
          <view v-if="userInfo.isVip" class="vip-badge">VIP</view>
        </view>
        <!-- #endif -->

        <view class="info-content">
          <!-- #ifdef MP-WEIXIN -->
          <view v-if="isLoggedIn" class="nickname-row editable official">
            <input
              v-model="nicknameDraft"
              class="nickname-input"
              type="nickname"
              maxlength="20"
              confirm-type="done"
              placeholder="请输入昵称"
              placeholder-style="color: #94A3B8;"
              @blur="handleNicknameSubmit"
              @confirm="handleNicknameSubmit"
            />
            <view v-if="userInfo.isVip" class="vip-tag">
              <image
                class="vip-icon-image"
                src="/static/icons/line/crown.svg"
                mode="aspectFit"
              />
              <text class="vip-text">尊贵会员</text>
            </view>
          </view>
          <view v-else class="nickname-row" @click="editNickname">
            <text class="nickname">{{ userInfo.nickname || "点击登录" }}</text>
            <view v-if="userInfo.isVip" class="vip-tag">
              <image
                class="vip-icon-image"
                src="/static/icons/line/crown.svg"
                mode="aspectFit"
              />
              <text class="vip-text">尊贵会员</text>
            </view>
          </view>
          <!-- #endif -->

          <!-- #ifndef MP-WEIXIN -->
          <view
            class="nickname-row"
            :class="{ editable: isLoggedIn }"
            @click="editNickname"
          >
            <text class="nickname">{{ userInfo.nickname || "点击登录" }}</text>
            <view v-if="userInfo.isVip" class="vip-tag">
              <image
                class="vip-icon-image"
                src="/static/icons/line/crown.svg"
                mode="aspectFit"
              />
              <text class="vip-text">尊贵会员</text>
            </view>
            <text v-if="isLoggedIn" class="edit-trigger">修改</text>
          </view>
          <!-- #endif -->

          <text class="user-id" v-if="isLoggedIn"
            >ID: {{ userInfo.inviteCode }}</text
          >
          <!-- #ifndef MP-WEIXIN -->
          <text v-if="isLoggedIn" class="profile-tip">点击头像或昵称可自定义资料</text>
          <!-- #endif -->
        </view>
      </view>

      <!-- 统计数据 -->
      <view class="stats-card">
        <view class="stat-item" @click="goPointsLog">
          <view class="stat-icon-wrapper points">
            <image
              class="stat-icon-image"
              src="/static/icons/line/coins.svg"
              mode="aspectFit"
            />
          </view>
          <text class="stat-value">{{ userInfo.points }}</text>
          <text class="stat-label">积分</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <view class="stat-icon-wrapper views">
            <image
              class="stat-icon-image"
              src="/static/icons/line/ticket.svg"
              mode="aspectFit"
            />
          </view>
          <text class="stat-value">{{ userInfo.freeViews }}</text>
          <text class="stat-label">免费次数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goInvite">
          <view class="stat-icon-wrapper invite">
            <image
              class="stat-icon-image"
              src="/static/icons/line/users.svg"
              mode="aspectFit"
            />
          </view>
          <text class="stat-value">{{ userInfo.inviteCount }}</text>
          <text class="stat-label">邀请人数</text>
        </view>
      </view>

      <!-- 每日任务 -->
      <view class="daily-tasks">
        <view
          class="task-card sign-in"
          :class="{ completed: hasSigned }"
          @click="doSignIn"
        >
          <view class="task-content">
            <image
              class="task-icon-image"
              :src="
                hasSigned
                  ? '/static/icons/line/check-circle.svg'
                  : '/static/icons/line/calendar.svg'
              "
              mode="aspectFit"
            />
            <view class="task-info">
              <text class="task-title">{{
                hasSigned ? "已签到" : "每日签到"
              }}</text>
              <text class="task-reward">+5 积分</text>
            </view>
          </view>
          <image
            class="task-arrow-image"
            src="/static/icons/line/chevron-right.svg"
            mode="aspectFit"
          />
        </view>
        <view class="task-card watch-ad" @click="watchAd">
          <view class="task-content">
            <image
              class="task-icon-image"
              src="/static/icons/line/video.svg"
              mode="aspectFit"
            />
            <view class="task-info">
              <text class="task-title">看视频</text>
              <text class="task-reward">+10 积分</text>
            </view>
          </view>
          <image
            class="task-arrow-image"
            src="/static/icons/line/chevron-right.svg"
            mode="aspectFit"
          />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll" :style="contentScrollStyle">
      <!-- 菜单列表 -->
      <view class="menu-section">
        <view class="menu-group">
          <view class="menu-item" @click="goFavorites">
            <view class="menu-icon-wrapper favorites">
              <image
                class="menu-icon-image"
                src="/static/icons/line/heart.svg"
                mode="aspectFit"
              />
            </view>
            <text class="menu-title">我的收藏</text>
            <image
              class="menu-arrow-image"
              src="/static/icons/line/chevron-right.svg"
              mode="aspectFit"
            />
          </view>
          <view class="menu-item" @click="goAchievements">
            <view class="menu-icon-wrapper achievements">
              <image
                class="menu-icon-image"
                src="/static/icons/line/trophy.svg"
                mode="aspectFit"
              />
            </view>
            <text class="menu-title">学习成就</text>
            <image
              class="menu-arrow-image"
              src="/static/icons/line/chevron-right.svg"
              mode="aspectFit"
            />
          </view>
          <view class="menu-item" @click="goInvite">
            <view class="menu-icon-wrapper invite">
              <image
                class="menu-icon-image"
                src="/static/icons/line/gift.svg"
                mode="aspectFit"
              />
            </view>
            <text class="menu-title">赚取积分</text>
            <view class="menu-badge">任务中心</view>
            <image
              class="menu-arrow-image"
              src="/static/icons/line/chevron-right.svg"
              mode="aspectFit"
            />
          </view>
          <view class="menu-item" @click="goPointsLog">
            <view class="menu-icon-wrapper points">
              <image
                class="menu-icon-image"
                src="/static/icons/line/bar-chart.svg"
                mode="aspectFit"
              />
            </view>
            <text class="menu-title">积分明细</text>
            <image
              class="menu-arrow-image"
              src="/static/icons/line/chevron-right.svg"
              mode="aspectFit"
            />
          </view>
        </view>

        <view class="menu-group">
          <view class="menu-item" @click="goFeedback">
            <view class="menu-icon-wrapper feedback">
              <image
                class="menu-icon-image"
                src="/static/icons/line/message.svg"
                mode="aspectFit"
              />
            </view>
            <text class="menu-title">意见反馈</text>
            <image
              class="menu-arrow-image"
              src="/static/icons/line/chevron-right.svg"
              mode="aspectFit"
            />
          </view>
          <view class="menu-item" @click="goAbout">
            <view class="menu-icon-wrapper about">
              <image
                class="menu-icon-image"
                src="/static/icons/line/info.svg"
                mode="aspectFit"
              />
            </view>
            <text class="menu-title">关于我们</text>
            <image
              class="menu-arrow-image"
              src="/static/icons/line/chevron-right.svg"
              mode="aspectFit"
            />
          </view>
          <button class="menu-item share-btn" open-type="share">
            <view class="menu-icon-wrapper share">
              <image
                class="menu-icon-image"
                src="/static/icons/line/share.svg"
                mode="aspectFit"
              />
            </view>
            <text class="menu-title">分享给朋友</text>
            <image
              class="menu-arrow-image"
              src="/static/icons/line/chevron-right.svg"
              mode="aspectFit"
            />
          </button>
        </view>

        <view v-if="store.isAdmin" class="menu-group">
          <view class="menu-item" @click="goAdmin">
            <view class="menu-icon-wrapper admin">
              <image
                class="menu-icon-image"
                src="/static/icons/line/shield.svg"
                mode="aspectFit"
              />
            </view>
            <text class="menu-title">管理后台</text>
            <view class="menu-badge admin-badge">管理员</view>
            <image
              class="menu-arrow-image"
              src="/static/icons/line/chevron-right.svg"
              mode="aspectFit"
            />
          </view>
        </view>
      </view>

      <!-- 登录按钮 -->
      <view v-if="!isLoggedIn" class="login-section">
        <view class="login-btn" @click="doLogin">
          <image
            class="login-icon-image"
            src="/static/icons/line/wechat.svg"
            mode="aspectFit"
          />
          <text class="login-text">微信一键登录</text>
        </view>
        <text class="login-tip">登录后可保存学习进度和收藏</text>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom"></view>
    </scroll-view>

    <CustomTabbar :current="2" :reserve-space="false" />
  </view>
</template>

<script setup lang="ts">
import CustomTabbar from "@/components/CustomTabbar/CustomTabbar.vue";
import { useUserPage } from "./hooks/useUserPage";

const {
  chooseAvatar,
  contentScrollStyle,
  defaultAvatar,
  doLogin,
  doSignIn,
  editNickname,
  goAbout,
  goAchievements,
  goAdmin,
  goFavorites,
  goFeedback,
  goInvite,
  goPointsLog,
  handleChooseAvatar,
  handleNicknameSubmit,
  hasSigned,
  isLoggedIn,
  nicknameDraft,
  statusBarHeight,
  store,
  userInfo,
  watchAd,
} = useUserPage();
</script>

<style src="./styles/user.scss" scoped lang="scss"></style>
