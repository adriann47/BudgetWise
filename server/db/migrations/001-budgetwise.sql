CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX user_sessions_expire_idx ON user_sessions (expire);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos BETWEEN 1 AND 100000000),
  category TEXT NOT NULL CHECK (category IN ('Food','Transport','School','Bills','Personal','Other')),
  spent_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_user_date_idx ON expenses(user_id, spent_on DESC, id DESC);

CREATE TABLE budgets (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  category TEXT NOT NULL CHECK (category IN ('Food','Transport','School','Bills','Personal','Other')),
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos BETWEEN 1 AND 100000000),
  PRIMARY KEY (user_id, month, category)
);
