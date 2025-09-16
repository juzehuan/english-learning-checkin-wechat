-- 数据库初始化脚本
-- 创建users表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  openid VARCHAR(100) NOT NULL UNIQUE,
  nickname VARCHAR(100) NOT NULL,
  avatarUrl VARCHAR(500),
  totalPoints INT DEFAULT 0,
  consecutiveDays INT DEFAULT 0,
  lastSigninDate DATETIME,
  skipCards INT DEFAULT 0,
  skipQuizCards INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建signin_records表
CREATE TABLE IF NOT EXISTS signin_records (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  date DATETIME NOT NULL UNIQUE,
  pointsEarned INT DEFAULT 10,
  consecutiveDays INT NOT NULL,
  isSkipped BOOLEAN DEFAULT false,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建quiz_records表
CREATE TABLE IF NOT EXISTS quiz_records (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  friendId VARCHAR(36),
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  content VARCHAR(500) NOT NULL,
  result ENUM('pass', 'fail', 'partial') NOT NULL,
  correctCount INT DEFAULT 0,
  wrongCount INT DEFAULT 0,
  role ENUM('答题者', '提问者') DEFAULT '答题者',
  score INT CHECK (score >= 0 AND score <= 100),
  duration INT CHECK (duration >= 0),
  isSkipped BOOLEAN DEFAULT false,
  pointsEarned INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friendId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建friendships表
CREATE TABLE IF NOT EXISTS friendships (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  friendId VARCHAR(100) NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  message VARCHAR(500) DEFAULT '我想添加你为好友',
  requestTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  acceptTime DATETIME,
  rejectTime DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_friendship (userId, friendId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 添加索引以提高查询性能
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_signin_records_user_date ON signin_records(userId, date);
CREATE INDEX idx_quiz_records_user_date ON quiz_records(userId, date);
CREATE INDEX idx_friendships_user_status ON friendships(userId, status);
CREATE INDEX idx_friendships_friend_status ON friendships(friendId, status);

-- 创建触发器确保updateAt字段自动更新
DELIMITER //
CREATE TRIGGER update_users_updatedAt BEFORE UPDATE ON users
FOR EACH ROW BEGIN
  SET NEW.updatedAt = NOW();
END;//

CREATE TRIGGER update_friendships_updatedAt BEFORE UPDATE ON friendships
FOR EACH ROW BEGIN
  SET NEW.updatedAt = NOW();
END;//
DELIMITER ;

-- 可选：插入测试数据
/*
INSERT INTO users (id, openid, nickname) VALUES
('1', 'test_openid_1', '测试用户1'),
('2', 'test_openid_2', '测试用户2');
*/

-- 完成提示
SELECT '数据库表结构创建完成' AS message;