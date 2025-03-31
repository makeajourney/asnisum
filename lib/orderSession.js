const redis = require('./redis');

// 로깅 함수
const logger = {
  error: (...args) => {
    console.error(new Date().toISOString(), ...args);
  },
  info: (...args) => {
    console.log(new Date().toISOString(), ...args);
  },
};

const SessionStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

class OrderSession {
  constructor() {
    // 환경에 따라 다른 접두사 사용
    const env = process.env.VERCEL_ENV === 'production' ? 'prod' : 'dev';
    this.keyPrefix = `${env}_order_session:`;
    this.SESSION_EXPIRY = 10 * 60 * 60; // 24시간
  }

  // 나머지 코드는 동일
  getSessionKey(channelId) {
    return `${this.keyPrefix}${channelId}`;
  }

  // 새 세션 시작
  async startSession(channelId, messageTs, startedByUserId) {
    try {
      const sessionKey = this.getSessionKey(channelId);
      const exists = await this.isActiveSession(channelId);

      logger.info('Starting new session:', { channelId, exists });

      if (exists) {
        return false;
      }

      const session = {
        messageTs,
        startedByUserId,
        orders: [],
        startTime: new Date().toISOString(),
        status: 'active',
      };

      const sessionStr = JSON.stringify(session);
      logger.info('Setting session data:', { sessionKey, sessionStr });

      await redis.set(sessionKey, sessionStr);
      await redis.expire(sessionKey, this.SESSION_EXPIRY);

      return true;
    } catch (error) {
      logger.error('Error in startSession:', error);
      throw error;
    }
  }

  // 세션 종료
  async endSession(channelId) {
    try {
      const sessionKey = this.getSessionKey(channelId);
      const session = await this.getSession(channelId);

      if (!session || session.status !== 'active') {
        return false;
      }

      session.status = 'completed';
      await redis.set(sessionKey, JSON.stringify(session));
      return true;
    } catch (error) {
      logger.error('Error in endSession:', error);
      throw error;
    }
  }

  // 활성 세션 확인
  async isActiveSession(channelId) {
    try {
      const session = await this.getSession(channelId);
      return session && session.status === SessionStatus.ACTIVE;
    } catch (error) {
      logger.error('Error in isActiveSession:', error);
      throw error;
    }
  }

  // 주문 추가
  async addOrder(channelId, order) {
    try {
      const sessionKey = this.getSessionKey(channelId);
      const session = await this.getSession(channelId);

      if (!session || session.status !== 'active') {
        return false;
      }

      session.orders.push(order);
      await redis.set(sessionKey, JSON.stringify(session));
      return true;
    } catch (error) {
      logger.error('Error in addOrder:', error);
      throw error;
    }
  }

  // 세션 정보 가져오기
  async getSession(channelId) {
    try {
      const sessionKey = this.getSessionKey(channelId);
      const data = await redis.get(sessionKey);

      logger.info('Retrieved session data:', {
        sessionKey,
        dataType: typeof data,
        data,
      });

      if (!data) return null;

      // data가 이미 객체인 경우
      if (typeof data === 'object') {
        return data;
      }

      // 문자열인 경우 파싱
      try {
        return JSON.parse(data);
      } catch (parseError) {
        logger.error('Error parsing session data:', {
          parseError,
          data,
        });
        return null;
      }
    } catch (error) {
      logger.error('Error in getSession:', error);
      throw error;
    }
  }

  // 세션 삭제
  async clearSession(channelId) {
    try {
      const sessionKey = this.getSessionKey(channelId);
      await redis.del(sessionKey);
    } catch (error) {
      logger.error('Error in clearSession:', error);
      throw error;
    }
  }
}

module.exports = new OrderSession();
