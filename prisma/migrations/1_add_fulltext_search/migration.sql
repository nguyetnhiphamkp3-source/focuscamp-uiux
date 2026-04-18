-- Full-text search: add tsvector columns + GIN indexes

-- Post search vector (title + body)
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE INDEX IF NOT EXISTS "Post_searchVector_idx" ON "Post" USING GIN ("searchVector");

-- Trigger to auto-update searchVector on insert/update
CREATE OR REPLACE FUNCTION post_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."body", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_search_vector_trigger ON "Post";
CREATE TRIGGER post_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "body" ON "Post"
  FOR EACH ROW
  EXECUTE FUNCTION post_search_vector_update();

-- Backfill existing posts
UPDATE "Post" SET "searchVector" =
  setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("body", '')), 'B');

-- User search vector (name + handle + bio)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE INDEX IF NOT EXISTS "User_searchVector_idx" ON "User" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION user_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."handle", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."bio", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_search_vector_trigger ON "User";
CREATE TRIGGER user_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "name", "handle", "bio" ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION user_search_vector_update();

UPDATE "User" SET "searchVector" =
  setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("handle", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("bio", '')), 'B');

-- Community search vector (name + tagline + description)
ALTER TABLE "Community" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE INDEX IF NOT EXISTS "Community_searchVector_idx" ON "Community" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION community_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."tagline", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_search_vector_trigger ON "Community";
CREATE TRIGGER community_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "name", "tagline", "description" ON "Community"
  FOR EACH ROW
  EXECUTE FUNCTION community_search_vector_update();

UPDATE "Community" SET "searchVector" =
  setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("tagline", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("description", '')), 'B');
