<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@open-pencil/vue'
import { authApi } from '@/lib/client.ts'

const { auth } = useI18n()
const router = useRouter()

// 登录表单数据
const loginForm = ref({
  username_or_email: '', // snake_case
  password: '',
  remember_me: false // snake_case
})

// 表单验证状态
const errors = ref<{
  username_or_email?: string
  password?: string
  general?: string
}>({})
const isDev = ref(import.meta.env.DEV)

const isLoading = ref(false)

// 表单验证
const isValid = computed(() => {
  return (
    loginForm.value.username_or_email.trim().length > 0 &&
    loginForm.value.password.trim().length > 0
  )
})

// 验证单个字段
function validateField(field: 'username_or_email' | 'password'): boolean {
  const value = loginForm.value[field].trim()
  if (!value) {
    errors.value[field] =
      field === 'username_or_email' ? 'Username or email is required' : 'Password is required'
    return false
  }
  delete errors.value[field]
  return true
}

// 处理登录
async function handleLogin(): Promise<void> {
  // 清空之前的错误
  errors.value = {}

  // 验证所有字段
  const isUsernameValid = validateField('username_or_email')
  const isPasswordValid = validateField('password')

  if (!isUsernameValid || !isPasswordValid) {
    return
  }

  isLoading.value = true

  try {
    // 调用登录API - snake_case 格式
    await authApi.login({
      username_or_email: loginForm.value.username_or_email,
      password: loginForm.value.password
    })

    // 跳转到主页面
    await router.push('/dashboard')
  } catch (error) {
    errors.value.general =
      error instanceof Error ? error.message : 'Login failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

// 回车键提交
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !isLoading.value) {
    void handleLogin()
  }
}

// 从localStorage恢复记住的用户名
function loadRememberedUsername(): void {
  const remembered = localStorage.getItem('rememberedUsername')
  if (remembered) {
    loginForm.value.username_or_email = remembered
    loginForm.value.remember_me = true
  }
}

// 组件挂载时加载记住的用户名
onMounted(() => {
  loadRememberedUsername()
})
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-app px-4"
    data-test-id="login-page"
    @keydown="handleKeydown"
  >
    <!-- 登录卡片 -->
    <div class="w-full max-w-md rounded-lg border border-border bg-panel p-8 shadow-lg">
      <!-- Logo / 标题区域 -->
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10"
        >
          <icon-lucide-pencil class="size-8 text-accent" />
        </div>
        <h1 class="text-2xl font-bold text-surface">
          {{ auth.appName || 'Welcome Back' }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{ auth.loginSubtitle || 'Sign in to your account' }}
        </p>
      </div>

      <!-- 通用错误信息 -->
      <div
        v-if="errors.general"
        class="mb-4 rounded bg-danger/10 px-4 py-2 text-sm text-danger"
        role="alert"
      >
        {{ errors.general }}
      </div>

      <!-- 登录表单 -->
      <form class="space-y-4" @submit.prevent="handleLogin">
        <!-- 用户名/邮箱 -->
        <div>
          <label for="username_or_email" class="block text-sm font-medium text-surface">
            {{ auth.usernameOrEmail || 'Username or Email' }}
          </label>
          <input
            id="username_or_email"
            v-model="loginForm.username_or_email"
            type="text"
            autocomplete="username"
            class="mt-1.5 block w-full rounded border border-border bg-app px-3 py-2 text-sm text-surface placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            :class="{
              'border-danger focus:border-danger focus:ring-danger': errors.username_or_email
            }"
            :placeholder="auth.usernameOrEmailPlaceholder || 'Enter your username or email'"
            :disabled="isLoading"
            data-test-id="login-username"
            @blur="validateField('username_or_email')"
          />
          <p v-if="errors.username_or_email" class="mt-1 text-xs text-danger">
            {{ errors.username_or_email }}
          </p>
        </div>

        <!-- 密码 -->
        <div>
          <div class="flex items-center justify-between">
            <label for="password" class="block text-sm font-medium text-surface">
              {{ auth.password || 'Password' }}
            </label>
            <button
              type="button"
              class="text-xs text-muted transition-colors hover:text-surface"
              @click="router.push('/forgot-password')"
            >
              {{ auth.forgotPassword || 'Forgot password?' }}
            </button>
          </div>
          <input
            id="password"
            v-model="loginForm.password"
            type="password"
            autocomplete="current-password"
            class="mt-1.5 block w-full rounded border border-border bg-app px-3 py-2 text-sm text-surface placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            :class="{ 'border-danger focus:border-danger focus:ring-danger': errors.password }"
            :placeholder="auth.passwordPlaceholder || 'Enter your password'"
            :disabled="isLoading"
            data-test-id="login-password"
            @blur="validateField('password')"
          />
          <p v-if="errors.password" class="mt-1 text-xs text-danger">
            {{ errors.password }}
          </p>
        </div>

        <!-- 记住我 -->
        <div class="flex items-center justify-between">
          <label
            class="flex cursor-pointer items-center gap-2 text-sm text-muted transition-colors hover:text-surface"
          >
            <input
              v-model="loginForm.remember_me"
              type="checkbox"
              class="h-4 w-4 rounded border-border bg-app text-accent focus:ring-accent focus:ring-offset-0 disabled:opacity-50"
              :disabled="isLoading"
            />
            {{ auth.rememberMe || 'Remember me' }}
          </label>
        </div>
        <div class="relative my-2" v-if="isDev">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-border"></div>
          </div>
          <div
            class="relative flex justify-center text-xs cursor-pointer"
            @click="
              () => {
                // 填充账号
                loginForm.password = '123456'
                loginForm.username_or_email = 'admin@jongwong.cn'
              }
            "
          >
            <span class="bg-panel px-2 text-muted">Test Account</span>
          </div>
        </div>

        <!-- 登录按钮 -->
        <button
          type="submit"
          class="mt-6 w-full rounded bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-panel disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!isValid || isLoading"
          data-test-id="login-submit"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <icon-lucide-loader-circle class="size-4 animate-spin" />
            {{ auth.loggingIn || 'Logging in...' }}
          </span>
          <span v-else>
            {{ auth.signIn || 'Sign In' }}
          </span>
        </button>
      </form>

      <!-- 注册链接 -->
      <p class="mt-6 text-center text-sm text-muted">
        {{ auth.noAccount || "Don't have an account?" }}
        <button
          type="button"
          class="text-accent transition-colors hover:underline"
          @click="router.push('/register')"
        >
          {{ auth.signUp || 'Sign Up' }}
        </button>
      </p>
    </div>
  </div>
</template>
