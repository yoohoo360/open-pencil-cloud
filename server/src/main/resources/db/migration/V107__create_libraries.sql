CREATE TABLE pencil_libraries
(
    id             CHAR(36) PRIMARY KEY NOT NULL,
    key            VARCHAR(255) UNIQUE  NOT NULL,
    name           VARCHAR(500)         NOT NULL,
    url            VARCHAR(500)         NOT NULL,
    description    TEXT,
    project_id     CHAR(36),
    thumbnail_url  VARCHAR(255),
    version        VARCHAR(50),
    schema_version VARCHAR(50),
    is_deleted     INT DEFAULT 0,
    created_at     BIGINT               NOT NULL,
    updated_at     BIGINT               NOT NULL
);

insert into pencil_libraries (id, key, name, description, thumbnail_url, url, version, created_at, updated_at)
values ('43b36f5c-571e-4545-ad6a-fba8cfc2c85f', 'web_lib_button', '按钮组件库', '按钮组件库描述',
        'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png', 'libraries/web_lib_button.fig',
        '1.0.0', 1679317200000, 1710853200000);

CREATE TABLE pencil_document_library_ref
(
    id               CHAR(36) PRIMARY KEY NOT NULL,
    document_key     VARCHAR(255) UNIQUE  NOT NULL,
    document_version VARCHAR(50)          NOT NULL,
    library_key      VARCHAR(255) UNIQUE  NOT NULL,
    library_version  VARCHAR(50)          NOT NULL,
    created_at       BIGINT               NOT NULL
);
