type Env = 'development' | 'production' | 'test';

let currentEnv: Env = (process.env.NODE_ENV as Env) || 'development';

export function setEnv(env: Env) {
  currentEnv = env;
}

export function getEnv(): Env {
  return currentEnv;
}
