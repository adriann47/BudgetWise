-- Preserve existing expenses and budgets while assigning account-owned category IDs.
ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE categories (
 id SERIAL PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 40),
 description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 200),
 archived BOOLEAN NOT NULL DEFAULT false,
 UNIQUE(user_id,id)
);
CREATE UNIQUE INDEX categories_owner_name ON categories(user_id,lower(name));
INSERT INTO categories(user_id,name)
 SELECT u.id,n.name FROM users u CROSS JOIN
 (VALUES ('Food'),('Transport'),('School'),('Bills'),('Personal'),('Other')) AS n(name);
CREATE FUNCTION seed_user_categories() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO categories(user_id,name) VALUES
 (NEW.id,'Food'),(NEW.id,'Transport'),(NEW.id,'School'),(NEW.id,'Bills'),(NEW.id,'Personal'),(NEW.id,'Other');
 RETURN NEW;
END;
$$;
CREATE TRIGGER users_default_categories AFTER INSERT ON users
 FOR EACH ROW EXECUTE FUNCTION seed_user_categories();
ALTER TABLE expenses ADD COLUMN category_id INTEGER;
UPDATE expenses e SET category_id=c.id FROM categories c WHERE c.user_id=e.user_id AND c.name=e.category;
ALTER TABLE expenses ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE expenses ADD FOREIGN KEY (user_id,category_id) REFERENCES categories(user_id,id);
ALTER TABLE expenses DROP COLUMN category;
ALTER TABLE budgets ADD COLUMN category_id INTEGER;
UPDATE budgets b SET category_id=c.id FROM categories c WHERE c.user_id=b.user_id AND c.name=b.category;
ALTER TABLE budgets ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE budgets DROP CONSTRAINT budgets_pkey;
ALTER TABLE budgets DROP COLUMN category;
ALTER TABLE budgets ADD PRIMARY KEY(user_id,month,category_id);
ALTER TABLE budgets ADD FOREIGN KEY(user_id,category_id) REFERENCES categories(user_id,id);
-- Express owns authorization. Browser Data API access is not granted.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
