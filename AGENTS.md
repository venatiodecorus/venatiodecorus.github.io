# AGENTS.md - Agentic Coding Guidelines

## Project Overview

- **Site URL**: https://venatio.dev/
- **Framework**: Hugo (static site generator) - requires **extended version**
- **Theme**: hugo-blog-awesome v1.21.0 (via Hugo Modules)
- **Go Version**: 1.23.5

## Build Commands

```bash
hugo server              # Dev server with live reload
hugo server -D           # Include drafts
hugo                     # Build site to /public
hugo --minify            # Production build
rm -rf public && hugo    # Clean build
```

## Hugo Module Commands

```bash
hugo mod get -u github.com/hugo-sid/hugo-blog-awesome  # Update theme
hugo mod get -u          # Update all modules
hugo mod tidy            # Clean dependencies
hugo mod verify          # Verify modules
```

## Content Creation

```bash
hugo new posts/my-post-title.md   # New blog post
hugo new pages/my-page.md         # New page
```

## Validation & Debugging

```bash
hugo list all            # List all content
hugo list drafts         # List drafts
hugo --verbose           # Verbose output
hugo --templateMetrics   # Template performance
```

## Project Structure

```
├── archetypes/          # Content templates for `hugo new`
├── assets/              # Source files (images, SCSS) for Hugo Pipes
├── content/
│   ├── pages/           # Static pages (about.md)
│   └── posts/           # Blog posts
├── layouts/             # Custom template overrides
│   ├── partials/bio.html
│   └── rss.xml
├── static/              # Static files copied as-is
├── go.mod               # Go module definition
└── hugo.toml            # Site configuration (TOML format)
```

## Code Style Guidelines

### Content Files (Markdown)

Use TOML front matter (`+++`):

```markdown
+++
date = '2026-04-02T14:07:58-04:00'
draft = false
title = 'Post Title Here'
+++
```

**Required fields**: `date`, `draft`, `title`
**Optional fields**: `tags`, `categories`, `description`, `author`, `toc`

### Hugo Templates

```html
{{ $var := .Site.Params.something }}  <!-- Variable assignment -->
{{ with .Params.author }}             <!-- Nil-safe access -->
  <p>By {{ . }}</p>
{{ end }}
{{ range .Site.RegularPages }}        <!-- Loop -->
  <a href="{{ .Permalink }}">{{ .Title }}</a>
{{ end }}
```

- Use `{{- -}}` for whitespace trimming
- Prefer `with` blocks over `if` for nil-safe access

### Configuration (hugo.toml)

- Use camelCase for params: `defaultColor`, `sitename`
- Use lowercase for sections: `[params]`, `[module]`
- Language settings under `[Languages.en-us]`

## Theme Customization

Override theme templates by placing files in `/layouts/`:
- `layouts/partials/` - Override partials
- `layouts/_default/` - Override base templates

**Current customizations**:
- `layouts/partials/bio.html` - Custom author bio
- `layouts/rss.xml` - Custom RSS feed

### Key Theme Parameters

```toml
[Languages.en-us.params]
  defaultColor = "dark"    # dark, light, auto
  toc = true               # Table of contents
  goToTop = true           # Go to top button

[Languages.en-us.params.author]
  avatar = "avatar.jpg"    # Place in assets/
  name = "Your Name"
```

### Social Icons

```toml
[[params.socialIcons]]
name = "github"
url = "https://github.com/username"
```

## File Naming Conventions

- Posts: `content/posts/kebab-case-title.md`
- Pages: `content/pages/page-name.md`
- Assets: `assets/avatar.jpg`, `assets/icons/`

## Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| Module not found | `hugo mod get -u && hugo mod tidy` |
| Template error | Check Hugo output for line numbers |
| Missing asset | Verify file exists in `assets/` or `static/` |
| SCSS not compiling | Ensure Hugo **extended** version is installed |

## Important Notes

1. **Hugo Extended Required** - Theme uses SCSS
2. **No Node.js** - Uses Hugo Modules, not npm
3. **TOML Config** - Not YAML or JSON
4. **Theme via Modules** - Not git submodules
5. **Dark Mode Default** - Site defaults to dark theme

## URLs

- Posts: `/posts/post-slug/`
- Pages: `/page-slug/`
- RSS: `/index.xml`
- Sitemap: `/sitemap.xml`
