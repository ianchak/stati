let currentEnv = process.env.NODE_ENV || 'development';

export function setEnv(env: 'development' | 'production' | 'test') {
  currentEnv = env;
}

export function getEnv() {
  return currentEnv;
}
