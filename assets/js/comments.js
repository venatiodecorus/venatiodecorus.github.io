// ==========================================================================
// Social Comments — Bluesky + Mastodon unified comment stream
//
// Fetches replies from Bluesky and/or Mastodon, normalizes them into a
// common format, merges by timestamp, and renders with source icons and
// optional threaded replies (one level deep).
// ==========================================================================

(function () {
  'use strict';

  var container = document.getElementById('comments-container');
  if (!container) return;

  var blueskyUrl = container.dataset.bluesky || '';
  var mastodonUrl = container.dataset.mastodon || '';
  var demoMode = container.dataset.demo === 'true';

  // -- SVG icons (inline, tiny) -------------------------------------------

  var ICONS = {
    bluesky: '<svg class="comment__source-icon" viewBox="0 0 568 501" fill="currentColor" aria-label="Bluesky"><path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 49.9902C568 65.2346 558.055 187.879 552.222 210.769C534.606 279.233 466.391 296.232 405.314 285.837C507.217 304.068 536.667 375.523 472.667 446.977C352.038 581.1 295.394 440.806 284.514 413.058C283.698 410.942 283.174 409.622 284 409.622C284.826 409.622 284.302 410.942 283.486 413.058C272.606 440.806 215.962 581.1 95.3333 446.977C31.3333 375.523 60.7833 304.068 162.686 285.837C101.609 296.232 33.3943 279.233 15.7782 210.769C9.94525 187.879 0 65.2346 0 49.9902C0 -28.9064 76.1345 -1.61183 123.121 33.6637Z"/></svg>',
    mastodon: '<svg class="comment__source-icon" viewBox="0 0 24 24" fill="currentColor" aria-label="Mastodon"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.547c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054 19.648 19.648 0 0 0 4.581.536h.344c1.587 0 3.177-.088 4.755-.283a.711.711 0 0 0 .141-.025c2.533-.48 4.943-1.981 5.19-6.471.008-.155.029-1.625.029-1.785 0-.547.199-3.873-.038-5.922zM19.903 13.2h-2.538v-4.593c0-1.156-.487-1.744-1.462-1.744-1.077 0-1.618.697-1.618 2.074v2.51h-2.523V8.937c0-1.377-.541-2.074-1.618-2.074-.975 0-1.462.588-1.462 1.744V13.2H6.145V8.756c0-1.156.294-2.076.882-2.76.608-.684 1.404-1.035 2.39-1.035 1.14 0 2.005.437 2.583 1.311l.557.929.556-.929c.578-.874 1.443-1.311 2.583-1.311.986 0 1.782.35 2.39 1.035.588.684.882 1.604.882 2.76V13.2z"/></svg>',
    reply: '<svg class="comment__reply-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
    heart: '<svg class="comment__stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    repost: '<svg class="comment__stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'
  };

  // -- Helpers ------------------------------------------------------------

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function sanitizeHtml(html) {
    // Strip <script>, <style>, on* attributes from Mastodon HTML content.
    // Mastodon returns simple HTML (p, br, a, span) so this is sufficient.
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var scripts = tmp.querySelectorAll('script, style, iframe, object, embed');
    for (var i = 0; i < scripts.length; i++) scripts[i].remove();
    // Remove event handler attributes
    var all = tmp.querySelectorAll('*');
    for (var j = 0; j < all.length; j++) {
      var attrs = all[j].attributes;
      for (var k = attrs.length - 1; k >= 0; k--) {
        if (attrs[k].name.indexOf('on') === 0) {
          all[j].removeAttribute(attrs[k].name);
        }
      }
    }
    // Set all links to open externally
    var links = tmp.querySelectorAll('a');
    for (var l = 0; l < links.length; l++) {
      links[l].setAttribute('target', '_blank');
      links[l].setAttribute('rel', 'external nofollow noopener noreferrer');
    }
    return tmp.innerHTML;
  }

  function relativeTime(dateStr) {
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    if (diff < 31536000) return Math.floor(diff / 2592000) + 'mo ago';
    return Math.floor(diff / 31536000) + 'y ago';
  }

  // Linkify URLs in plain text (for Bluesky which returns plain text)
  function linkify(text) {
    return escapeHtml(text).replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="external nofollow noopener noreferrer">$1</a>'
    );
  }

  // -- Bluesky API --------------------------------------------------------

  function parseBlueskyUrl(url) {
    // https://bsky.app/profile/handle.bsky.social/post/3lbqta5lnck2i
    var m = url.match(/bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/);
    if (!m) return null;
    return { handle: m[1], rkey: m[2] };
  }

  function fetchBlueskyComments(url) {
    var parsed = parseBlueskyUrl(url);
    if (!parsed) return Promise.resolve([]);

    var atUri = 'at://' + parsed.handle + '/app.bsky.feed.post/' + parsed.rkey;
    var apiUrl = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread'
      + '?uri=' + encodeURIComponent(atUri)
      + '&depth=6';

    return fetch(apiUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.thread || !data.thread.replies) return [];
        var rootUri = data.thread.post.uri;
        return flattenBlueskyReplies(data.thread.replies, rootUri);
      })
      .catch(function (err) {
        console.error('Bluesky comments error:', err);
        return [];
      });
  }

  function flattenBlueskyReplies(replies, rootUri) {
    var out = [];
    for (var i = 0; i < replies.length; i++) {
      var r = replies[i];
      if (!r.post) continue;
      // Skip blocked/not-found replies
      if (r['$type'] === 'app.bsky.feed.defs#blockedPost' ||
          r['$type'] === 'app.bsky.feed.defs#notFoundPost') continue;

      var isReply = r.post.record && r.post.record.reply &&
                    r.post.record.reply.parent &&
                    r.post.record.reply.parent.uri !== rootUri;

      out.push({
        id: r.post.uri,
        source: 'bluesky',
        author: {
          name: r.post.author.displayName || r.post.author.handle,
          handle: '@' + r.post.author.handle,
          avatar: r.post.author.avatar || '',
          url: 'https://bsky.app/profile/' + r.post.author.handle
        },
        content: linkify(r.post.record.text || ''),
        date: r.post.record.createdAt || r.post.indexedAt,
        likes: r.post.likeCount || 0,
        reposts: r.post.repostCount || 0,
        url: 'https://bsky.app/profile/' + r.post.author.handle + '/post/' + r.post.uri.split('/').pop(),
        parentId: isReply ? r.post.record.reply.parent.uri : null
      });

      // Recurse into nested replies
      if (r.replies && r.replies.length > 0) {
        out = out.concat(flattenBlueskyReplies(r.replies, rootUri));
      }
    }
    return out;
  }

  // -- Mastodon API -------------------------------------------------------

  function parseMastodonUrl(url) {
    // https://mastodon.social/@user/109774012599031406
    // or https://mastodon.social/users/user/statuses/109774012599031406
    var m = url.match(/^https?:\/\/([^/]+)\/@[^/]+\/(\d+)/) ||
            url.match(/^https?:\/\/([^/]+)\/users\/[^/]+\/statuses\/(\d+)/);
    if (!m) return null;
    return { host: m[1], id: m[2] };
  }

  function fetchMastodonComments(url) {
    var parsed = parseMastodonUrl(url);
    if (!parsed) return Promise.resolve([]);

    var apiUrl = 'https://' + parsed.host + '/api/v1/statuses/' + parsed.id + '/context';

    return fetch(apiUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.descendants) return [];
        var rootId = parsed.id;
        return data.descendants
          .filter(function (s) { return s.visibility === 'public' || s.visibility === 'unlisted'; })
          .map(function (s) {
            return {
              id: 'mastodon-' + s.id,
              source: 'mastodon',
              author: {
                name: s.account.display_name || s.account.username,
                handle: '@' + s.account.acct,
                avatar: s.account.avatar_static || s.account.avatar || '',
                url: s.account.url
              },
              content: sanitizeHtml(s.content),
              date: s.created_at,
              likes: s.favourites_count || 0,
              reposts: s.reblogs_count || 0,
              url: s.url,
              parentId: s.in_reply_to_id !== rootId ? ('mastodon-' + s.in_reply_to_id) : null
            };
          });
      })
      .catch(function (err) {
        console.error('Mastodon comments error:', err);
        return [];
      });
  }

  // -- Demo data ----------------------------------------------------------

  function getDemoComments() {
    var now = Date.now();
    return [
      {
        id: 'demo-bsky-1',
        source: 'bluesky',
        author: {
          name: 'Alice Example',
          handle: '@alice.bsky.social',
          avatar: '',
          url: '#'
        },
        content: 'Great write-up! I\'ve been looking into something similar for my own setup. The approach to declarative configuration is really clean.',
        date: new Date(now - 3600000 * 2).toISOString(),
        likes: 5,
        reposts: 1,
        url: '#',
        parentId: null
      },
      {
        id: 'demo-bsky-2',
        source: 'bluesky',
        author: {
          name: 'Charlie Dev',
          handle: '@charlie.dev',
          avatar: '',
          url: '#'
        },
        content: 'Agreed! I switched to a similar stack last year and haven\'t looked back.',
        date: new Date(now - 3600000).toISOString(),
        likes: 2,
        reposts: 0,
        url: '#',
        parentId: 'demo-bsky-1'
      },
      {
        id: 'demo-masto-1',
        source: 'mastodon',
        author: {
          name: 'Bob Fediverse',
          handle: '@bob@hachyderm.io',
          avatar: '',
          url: '#'
        },
        content: '<p>This is a really helpful post. One thing I\'d add: make sure to check the rate limits if you\'re running this in production. Learned that the hard way.</p>',
        date: new Date(now - 3600000 * 4).toISOString(),
        likes: 3,
        reposts: 2,
        url: '#',
        parentId: null
      },
      {
        id: 'demo-masto-2',
        source: 'mastodon',
        author: {
          name: 'Dana Ops',
          handle: '@dana@mastodon.social',
          avatar: '',
          url: '#'
        },
        content: '<p>Bookmarking this for later. Would love to see a follow-up on monitoring strategies too.</p>',
        date: new Date(now - 1800000).toISOString(),
        likes: 1,
        reposts: 0,
        url: '#',
        parentId: null
      },
      {
        id: 'demo-bsky-3',
        source: 'bluesky',
        author: {
          name: 'Eve Builder',
          handle: '@eve.bsky.social',
          avatar: '',
          url: '#'
        },
        content: 'Have you considered using Pulumi instead of Terraform? Curious how they compare for this kind of setup.',
        date: new Date(now - 7200000).toISOString(),
        likes: 0,
        reposts: 0,
        url: '#',
        parentId: null
      },
      {
        id: 'demo-masto-3',
        source: 'mastodon',
        author: {
          name: 'Frank SRE',
          handle: '@frank@infosec.exchange',
          avatar: '',
          url: '#'
        },
        content: '<p>Good point about rate limits, <span class="h-card"><a href="#">@bob</a></span>. I usually set up a caching layer in front to avoid hitting those.</p>',
        date: new Date(now - 3600000 * 3).toISOString(),
        likes: 1,
        reposts: 0,
        url: '#',
        parentId: 'demo-masto-1'
      }
    ];
  }

  // -- Rendering ----------------------------------------------------------

  function buildCommentEl(comment, isReply) {
    var el = document.createElement('div');
    el.className = 'comment' + (isReply ? ' comment--reply' : '');
    el.setAttribute('data-id', comment.id);

    var avatarHtml = comment.author.avatar
      ? '<img class="comment__avatar" src="' + escapeHtml(comment.author.avatar) + '" alt="" loading="lazy" />'
      : '<div class="comment__avatar comment__avatar--placeholder">' + escapeHtml(comment.author.name.charAt(0).toUpperCase()) + '</div>';

    var sourceIcon = ICONS[comment.source] || '';

    var statsHtml = '';
    if (comment.likes > 0) {
      statsHtml += '<span class="comment__stat">' + ICONS.heart + ' ' + comment.likes + '</span>';
    }
    if (comment.reposts > 0) {
      statsHtml += '<span class="comment__stat">' + ICONS.repost + ' ' + comment.reposts + '</span>';
    }

    var replyIndicator = isReply ? '<span class="comment__reply-indicator">' + ICONS.reply + '</span>' : '';

    el.innerHTML =
      '<div class="comment__gutter">' +
        replyIndicator +
        '<a href="' + escapeHtml(comment.author.url) + '" target="_blank" rel="external nofollow noopener noreferrer">' +
          avatarHtml +
        '</a>' +
      '</div>' +
      '<div class="comment__main">' +
        '<div class="comment__header">' +
          '<a class="comment__author" href="' + escapeHtml(comment.author.url) + '" target="_blank" rel="external nofollow noopener noreferrer">' +
            escapeHtml(comment.author.name) +
          '</a>' +
          '<span class="comment__handle">' + escapeHtml(comment.author.handle) + '</span>' +
          '<span class="comment__source" title="via ' + escapeHtml(comment.source) + '">' + sourceIcon + '</span>' +
        '</div>' +
        '<div class="comment__body">' + comment.content + '</div>' +
        '<div class="comment__footer">' +
          '<a class="comment__time" href="' + escapeHtml(comment.url) + '" target="_blank" rel="external nofollow noopener noreferrer">' +
            relativeTime(comment.date) +
          '</a>' +
          statsHtml +
        '</div>' +
      '</div>';

    return el;
  }

  function renderComments(comments) {
    // Sort all by date ascending
    comments.sort(function (a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Build a map of id -> comment for threading
    var byId = {};
    for (var i = 0; i < comments.length; i++) {
      byId[comments[i].id] = comments[i];
    }

    // Separate top-level and replies
    var topLevel = [];
    var childrenOf = {}; // parentId -> [children]

    for (var j = 0; j < comments.length; j++) {
      var c = comments[j];
      if (c.parentId && byId[c.parentId]) {
        if (!childrenOf[c.parentId]) childrenOf[c.parentId] = [];
        childrenOf[c.parentId].push(c);
      } else {
        topLevel.push(c);
      }
    }

    container.innerHTML = '';

    if (topLevel.length === 0) {
      container.innerHTML = '<p class="comments__empty">No comments yet. Be the first to reply!</p>';
      return;
    }

    var frag = document.createDocumentFragment();

    for (var k = 0; k < topLevel.length; k++) {
      var parent = topLevel[k];
      var thread = document.createElement('div');
      thread.className = 'comment-thread';
      thread.appendChild(buildCommentEl(parent, false));

      // Render direct replies (one level deep to keep UI clean)
      var children = childrenOf[parent.id];
      if (children) {
        for (var r = 0; r < children.length; r++) {
          thread.appendChild(buildCommentEl(children[r], true));
        }
      }

      frag.appendChild(thread);
    }

    container.appendChild(frag);
  }

  // -- Init ---------------------------------------------------------------

  function init() {
    if (demoMode) {
      renderComments(getDemoComments());
      return;
    }

    var promises = [];
    if (blueskyUrl) promises.push(fetchBlueskyComments(blueskyUrl));
    if (mastodonUrl) promises.push(fetchMastodonComments(mastodonUrl));

    if (promises.length === 0) {
      container.innerHTML = '<p class="comments__empty">No comment sources configured.</p>';
      return;
    }

    Promise.all(promises)
      .then(function (results) {
        var all = [];
        for (var i = 0; i < results.length; i++) {
          all = all.concat(results[i]);
        }
        renderComments(all);
      })
      .catch(function (err) {
        console.error('Failed to load comments:', err);
        container.innerHTML = '<p class="comments__error">Failed to load comments.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
