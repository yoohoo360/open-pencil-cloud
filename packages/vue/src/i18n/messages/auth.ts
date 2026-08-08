import { i18n } from '#vue/i18n/create'

export const authMessageDefaults = {
  appName: 'Canvas',
  welcomeBack: 'Welcome Back',
  loginSubtitle: 'Sign in to your account',
  usernameOrEmail: 'Username or Email',
  usernameOrEmailPlaceholder: 'Enter your username or email',
  password: 'Password',
  passwordPlaceholder: 'Enter your password',
  rememberMe: 'Remember me',
  forgotPassword: 'Forgot password?',
  signIn: 'Sign In',
  loggingIn: 'Logging in...',
  noAccount: "Don't have an account?",
  signUp: 'Sign Up'
} as const

export const authMessages = i18n('auth', authMessageDefaults)
