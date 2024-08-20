---
title: Building a Full-Text Search Engine in a Single File with SQLite
description: SQLite's FTS5 plugin allows you to add full-text search to your apps with support for word stemming, ranking functions, and an advanced query syntax.
date: 2024-08-20T00:00:00-04:00
image: ./image.png
---

## What is SQLite?

SQLite is a full, self-contained SQL database engine that stores information in a single file. It's probably already [installed on every device you own](https://www.sqlite.org/mostdeployed.html), and it's built and maintained by a small team of only [three developers](https://www.sqlite.org/crew.html).

If you aren't familiar with it, I highly recommend you read their [about page](https://www.sqlite.org/about.html).

### When should you use it?

You can use SQLite for most small to medium-scale web applications (in addition to [many other](https://sqlite.org/whentouse.html) documented uses) without facing any performance issues. For most read-heavy applications, SQLite is all you'll ever need! If you need to scale your backend horizontally, you could still stick with SQLite if you wanted to via [LiteFS](https://github.com/superfly/litefs) or migrate to a client/server database like PostgreSQL.

### Easysearch

If you are interested in a project built on the same concepts that this article explores, check out [Easysearch](https://github.com/FluxCapacitor2/easysearch/). It is an open-source project that I built that crawls your site, adds pages to a search index, and exposes a JSON API and a prebuilt search interface for you.

## Enabling FTS5

`FTS5` ("**F**ull **T**ext **S**earch **5**") is a built-in SQLite extension that allows you to create full-text search indexes on your data.

To enable it, you can pass a [compile-time option](https://www.sqlite.org/compile.html#enable_fts5), but you are most likely using a prebuilt version of SQLite with a library for your favorite programming language.

In most distributions, it's enabled by default. You can check if it's enabled by running

```sh
sqlite3 ':memory:'
```

This opens an in-memory database. Then, run

```sql
PRAGMA compile_options;
```

If `ENABLE_FTS5` is present in the output, then you're good to go!

A specific case that I came across: if you're using [mattn/go-sqlite3](https://github.com/mattn/go-sqlite3), pass the `fts5` compile tag to include the extension when compiling:

```sh
go build --tags "fts5" .
```

## Creating a Table

To get started, let's create a table for our documents:

```sql
CREATE TABLE IF NOT EXISTS pages(
  url TEXT UNIQUE,
  title TEXT,
  description TEXT,
  content TEXT
);
```

Then, let's create a virtual table for the `FTS5` extension to maintain a search index:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
    url,
    title,
    description,
    content,

    -- Specify that this FTS table is contentless and gets its content from the `pages` table
    content=pages
);
```

This statement specifies the columns we want to be indexed (`url`, `title`, `description`, and `content`) and where the content is coming from (the `pages` table).

Even though we specify that content comes from the `pages` table, we still have to update the virtual table manually whenever we update the content table to keep the two in sync. This can be automated with triggers (see below).

### Aside: why not just use one table?

We could use `UNINDEXED` columns in an `FTS5` virtual table instead of creating a separate table for metadata.
To do this, you would create the table like this:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    updatedAt UNINDEXED,
    userId UNINDEXED,
    url,
    title,
    description,
    content,
);
```

Keeping all of our information in one table gives us simplicity at the cost of control.

- **Pro**: This way, you don't have to keep two tables in sync, and your search index will never be out of sync with your content.
- **Con**: In FTS tables, all of your columns are of the `TEXT` type.
- **Con**: You can't add indexes to FTS5 virtual tables (besides the default full-text search index, of course). This means that filtering using `WHERE` clauses that don't use `MATCH` could cause a full table scan, greatly reducing performance.
- **Con**: With a one-table setup, you have less control over when the index is updated, which can be computationally expensive. By separating content and metadata, you can decide to (for example) update metadata without updating content or update content in bulk after a certain amount of batched updates.

For these reasons, if you have any metadata that doesn't need to be added to the full-text search index, I recommend going with a two-table approach.

## Keeping Your Content Up-to-Date

The FTS5 documentation has an [example](https://sqlite.org/fts5.html#external_content_tables) set of triggers to keep your FTS table in sync with your content table.

Here it is:

```sql
-- Create a table. And an external content fts5 table to index it.
CREATE TABLE tbl(a INTEGER PRIMARY KEY, b, c);
CREATE VIRTUAL TABLE fts_idx USING fts5(b, c, content='tbl', content_rowid='a');

-- Triggers to keep the FTS index up to date.
CREATE TRIGGER tbl_ai AFTER INSERT ON tbl BEGIN
  INSERT INTO fts_idx(rowid, b, c) VALUES (new.a, new.b, new.c);
END;
CREATE TRIGGER tbl_ad AFTER DELETE ON tbl BEGIN
  INSERT INTO fts_idx(fts_idx, rowid, b, c) VALUES('delete', old.a, old.b, old.c);
END;
CREATE TRIGGER tbl_au AFTER UPDATE ON tbl BEGIN
  INSERT INTO fts_idx(fts_idx, rowid, b, c) VALUES('delete', old.a, old.b, old.c);
  INSERT INTO fts_idx(rowid, b, c) VALUES (new.a, new.b, new.c);
END;
```

In this example, the `tbl_ai` (`ai` = "auto insert") trigger inserts a row into the FTS table after a row is inserted into the content table. The `tbl_ad` ("auto delete") and `tbl_au` ("auto update") triggers do the same.

Here are a few FTS-specific items to note:

- The auto-update trigger (`tbl_au`) has to manually remove and reinsert the row because there is no way to `UPDATE` a row in an FTS virtual table.
- The `INSERT INTO ... VALUES ('delete', ...)` lines invoke the special FTS5 [`delete` command](https://sqlite.org/fts5.html#the_delete_command). Notice that, to delete a row, you must provide the values of **all** of its columns.

Now that the FTS virtual table will be updated automatically whenever we insert data, we can pretend that the it doesn't exist until we need to query it.

```sql
INSERT INTO tbl(1, 'searchable text', 'some more searchable text');
-- After this row is inserted into `tbl`,
-- the trigger (in this case, `tbl_ai`) runs,
-- which INSERTs the same row into the `fts_idx` table.
-- We are ready to run some search queries!
```

### Updating the index manually

You can also forgo the triggers, but you would have to update your FTS table **every time** you update the content table to keep the index in sync.

For example (using the same table names from the previous example):

```sql
INSERT INTO tbl(a, b, c) VALUES (1, 'searchable text', 'some more searchable text');

-- At this point, the index is out of sync. Make sure to update it with the same content!
-- (the trigger automates this next line)
INSERT INTO tbl_idx(rowid, b, c) VALUES (1, 'searchable text', 'some more searchable text');

-- The index is now in sync with the content table again. 🎉
```

## Querying

Now that you've added your content, it's time to run some search queries! You can search for content in your FTS5 virtual table using `MATCH` expressions:

```sql caption="This is a prepared statement where the first and only placeholder is the search query."
SELECT * FROM pages_fts WHERE pages_fts MATCH ?
```

FTS5 has a custom query syntax with a few operators:

- Column specifiers: only search one column for matches
- AND and OR: combine clauses
- NOT: exclude matches
- NEAR: find matches within a certain proximity to other matches
- "quotes": find a full phrase in a document
- \*: wildcard

All of these are optional. If you want to, you can expose these options to your users in a search interface, but you need to be careful! Unclosed quotes or other incorrect syntax will cause your query to fail.

The simplest type of query is a bare word:

```sql
SELECT * FROM pages_fts WHERE pages_fts MATCH 'hello';
```

This searches for all items that contain the word "hello" in any column. You can search specfic columns using a column specifier:

```sql
SELECT * FROM pages_fts WHERE pages_fts MATCH 'title : hello';
```

...or, if you want to search multiple columns, format them as a space-separated list inside curly braces:

```sql
SELECT * FROM pages_fts WHERE
  pages_fts MATCH '{title description} : hello';
```

You can negate a column specifier using a `-` before the expression:

```sql caption="Find rows where neither the title nor the description contain the word hello"
SELECT * FROM pages_fts WHERE
  pages_fts MATCH '- {title description} : hello';
```

Search for matches at the start of a column value using the `^` character, just like in a regular expression:

```sql
SELECT * FROM pages_fts WHERE
  pages_fts MATCH 'title : ^ hello';
```

_Note that, contrary to what you might expect, you cannot use `$` for a string-end match._

If your phrase contains multiple words, make sure to surround it with quotes or join the words with the `+` operator!

Combine different search queries into one using the boolean operators, `AND`, `OR`, and `NOT`:

```sql
-- Finds documents containing "hello" and "world" in no particular order
SELECT * FROM pages_fts WHERE
  pages_fts MATCH 'hello AND world';


-- Finds documents containing either "hello", "world", or both, in no particular order
SELECT * FROM pages_fts WHERE
  pages_fts MATCH 'hello OR world';


-- Finds documents containing "hello" and NOT containing "world"
SELECT * FROM pages_fts WHERE
  pages_fts MATCH 'hello NOT world';
```

One of the most useful operators is `*`, which marks the preceding token as a **prefix token**, matching the start of a word.

```sql
-- Matches words that start with "hel", like "hello", "held", and "helicopter"
SELECT * FROM pages_fts WHERE
  pages_fts MATCH 'hel*';
```

_Note that this cannot be used at the beginning of a token. It only works for the **end** of a phrase. If it's included anywhere other than the end of a phrase, the FTS5 extension will either ignore it or include it in the query, depending on the current tokenizer._

Finally, you can search for words based on their proximity to other words using the `NEAR` function.

```sql
SELECT * FROM pages_fts WHERE
  pages_fts MATCH 'NEAR("hello" "world", 10)';
```

_Note that there is no comma between the two phrases, but there **is** one before the number._

This query searches for documents matching `"hello"` within 10 tokens of a match for `"world"`.

### Escaping User Queries

If you need to escape users' search queries, perform some sanitization along these lines:

- Split words by word boundaries (`\W` in a regular expression)
- Remove empty words (optional)
- Surround each word with double quotes
- Join the words together with spaces in between
- Add a `*` to the end of the string to help complete partial queries (optional)

Splitting words by word boundaries will also remove quotes from each word, so you don't need to worry about stripping those manually.

As an example, here is what I do for [Easysearch](https://github.com/FluxCapacitor2/easysearch/):

```go

var re = regexp.MustCompile(`\W`)

func escape(searchTerm string) string {
	// Split the search term into individual words (this step also removes double quotes from the input)
	words := re.Split(searchTerm, -1)

	var filtered = make([]string, 0, len(words))
	for _, word := range words {
		if len(word) != 0 {
			filtered = append(filtered, word)
		}
	}

	// Surround each word with double quotes and add a * to match partial words at the end of the query
	quoted := fmt.Sprintf("\"%s\"*", strings.Join(filtered, "\" \""))
	return quoted
}
```

## Ranking

If you are building a search engine, you will obviously want to sort results by relevance. With FTS5, you can do this by sorting by the `rank` column:

```sql {2}
SELECT * FROM pages_fts WHERE pages_fts MATCH 'hello'
  ORDER BY rank;
```

If you `SELECT` the `rank` column, you can see the `bm25` scores for each result. Lower numbers indicate better matches because the default sorting order is ascending.

### Column Weighting

If some columns should be weighted higher than others in your results, you can use the built-in [`bm25` ranking function](https://sqlite.org/fts5.html#the_bm25_function) instead of the default `rank` column.

```sql
SELECT * FROM pages_fts WHERE pages_fts MATCH 'hello'
  ORDER BY bm25(pages_fts, 10.0, 5.0);
```

This query ranks the first column in the table twice as heavily as the second column. Add as many numeric parameters as you have columns in your FTS table; if you don't have enough, the remaining ones default to `1.0`.

## Highlighting Matches in Returned Results

FTS5 provides two auxiliary functions to help expose the matched phrases in search results: `highlight` and `snippet`.

### `highlight`

The `highlight` function returns the entire column value for each row. When a match is encountered, it is surrounded by the characters passed as the third (starting character) and fourth (ending character) arguments.

The first argument is the name of the FTS table, and the second argument is the 0-based index of the column to match.

```sql
SELECT highlight(pages_fts, 0, '[', ']') FROM pages_fts WHERE pages_fts MATCH 'hello';
```

This allows you to emphasize the matches for the user's query in your search results page.

### `snippet`

The `snippet` function is just like `highlight`, but it only returns a short section before and after the matched text. This is helpful when dealing with long text content in a column since `highlight` automatically performs truncation that you would likely have to do otherwise.

It accepts 6 arguments:

1. The name of the FTS table
2. The column index, or pass a negative number to automatically choose a column
3. A prefix string for each match
4. A suffix string for each match
5. A string to add at the beginning and/or end when there is additional content that was truncated; I recommend ellipses (`…`)
6. The maximum number of tokens (≈ number of words) to include in the snippet; up to 64

Here's an example:

```sql
SELECT
  snippet(pages_fts, 2, '<b>', '</b>', '…', 8) AS description
FROM pages_fts WHERE pages_fts MATCH 'hello';
```

This selects rows matching the search term "hello", highlights the exact matches in the 2nd column by surrounding them with `<b>` and `</b>` tags, truncates the match to at most 8 tokens, and adds ellipses where the snippet was truncated. (In a real project, you wouldn't use HTML tags like this since it would open you up to XSS attacks, but it's a good demonstrative example.)

In Easysearch's FTS queries, I use `highlight` for the page title (since I always want the full title to be returned) and `snippet` for the description and page content (for relevant search result snippets).

## FTS5 Commands

FTS5 allows you to administrate your virtual table using a number of special commands. These are formatted as `INSERT` statements &mdash; likely to avoid adding any new SQL keywords (maybe SQLite extensions aren't allowed to do this?), but I couldn't find a reliable source that explains this decision.

Here are some of the most useful commands:

### `optimize`

```sql
INSERT INTO pages_fts(pages_fts) VALUES ('optimize');
```

This command merges all separate B-trees into one, making your database smaller and your queries faster.
If you want to reclaim disk space, you will have to run [`VACUUM`](https://sqlite.org/lang_vacuum.html).

### `rebuild`

```sql
INSERT INTO pages_fts(pages_fts) VALUES ('rebuild');
```

If your content table gets out of sync with your FTS virtual table, you can use the `rebuild` command to recreate your search index from your content.

### `integrity-check`

```sql
-- Check the internal consistency of the index
INSERT INTO pages_fts(pages_fts) VALUES ('integrity-check');

-- Ensure the index also matches the external content table
INSERT INTO pages_fts(pages_fts, rank) VALUES ('integrity-check', 1);
```

This command allows you to ensure your search index is consistent internally and matches your content table. If there is a problem, these commands will fail with a [`SQLITE_CORRUPT_VTAB`](https://sqlite.org/rescode.html#corrupt_vtab) error, which can be fixed by running the `rebuild `command as described above.

### More Commands

For a complete command reference, see the [official documentation](https://sqlite.org/fts5.html#special_insert_commands).

## Further reading

- The official SQLite FTS5 documentation: https://sqlite.org/fts5.html
- Writing a custom scoring algorithm on top of SQLite's FTS4 extension: https://simonwillison.net/2019/Jan/7/exploring-search-relevance-algorithms-sqlite/
- Building a SQLite-powered search engine with Python and Datasette: https://simonwillison.net/2018/Dec/19/fast-autocomplete-search/
- An article exploring the different ways to implement full-text search and their tradeoffs: https://medium.com/dev-channel/how-to-add-full-text-search-to-your-website-4e9c80ce2bf4
- A SQLite extension that helps account for misspellings in search queries: https://sqlite.org/spellfix1.html
- My open-source web crawler that builds an FTS5 index on your website: https://github.com/FluxCapacitor2/easysearch/
