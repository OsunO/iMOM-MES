/**
 * Browser half of dsh-plugin-imom-mes.
 *
 * Renders the connection form on the bundle's own page in the Plugins panel.
 * Every configurable value is a credential, not plugin configuration, so this
 * form talks to the Host `remote.credentials` namespace: saving writes the value
 * into the harness credential store and the running mcp-client resolves the
 * reference again and rebuilds its connection — no DSH restart.
 *
 * Two deliberate construction rules, learned from a build that rendered nothing:
 *   1. rows are built as plain elements by a local function, never as a nested
 *      component — no component identity churn, no hook-order surprises;
 *   2. every fallible step reports its failure on screen instead of vanishing,
 *      so a broken form is diagnosable from the page itself.
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-imom-mes',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useState } = React;

    /** Locale namespace owned by this plugin. */
    const NS = 'mvpMesMcp';
    /** Bundle package name; also the key of the bundle-configuration slot. */
    const PACKAGE_NAME = 'dsh-plugin-imom-mes';
    /** Credential references the bundle patch substitutes, one form row each. */
    const PARAMS = [
      {
        "ref": "MOM_MES_API_KEY",
        "secret": true
      }
    ];
    const REFS = PARAMS.map(function (param) { return param.ref; });
    /** The Host answers at most 64 references per describe call. */
    const DESCRIBE_CHUNK = 64;

    const en = {
      "intro": "The connector reads the API key from the harness credential store. Saving it rebuilds the MES connection in place, with no restart.",
      "liveHint": "Tools from this server appear as mcp__mvpMes__<tool> once the key resolves.",
      "configured": "Configured",
      "notConfigured": "Not configured",
      "save": "Save",
      "saving": "Saving…",
      "saved": "Saved. The connection is being rebuilt.",
      "clear": "Clear",
      "cleared": "Cleared. The connection stops until a value is set again.",
      "failed": "The Host refused the value.",
      "unavailable": "Credential status is unavailable.",
      "reload": "Reload status",
      "missingHint": "Still missing:",
      "label_MOM_MES_API_KEY": "API key",
      "hint_MOM_MES_API_KEY": "Sent as the Authorization: Bearer header. Leave empty to keep the stored value."
    };
    const zh = {
      "intro": "连接器从 Harness 的凭据存储读取 API Key；保存后 MES 连接会自动重建，无需重启 DSH。",
      "liveHint": "该值解析成功后，服务的工具会以 mcp__mvpMes__<工具名> 出现。",
      "configured": "已配置",
      "notConfigured": "未配置",
      "save": "保存",
      "saving": "保存中…",
      "saved": "已保存，连接正在重建。",
      "clear": "清除",
      "cleared": "已清除，连接会在重新配置前保持断开。",
      "failed": "宿主拒绝了该值。",
      "unavailable": "无法读取凭据状态。",
      "reload": "刷新状态",
      "missingHint": "尚未配置：",
      "label_MOM_MES_API_KEY": "API Key",
      "hint_MOM_MES_API_KEY": "作为 Authorization: Bearer 请求头发送。留空表示沿用已保存的值。"
    };

    /** Inherits the host text colour, so light and dark both work. */
    const inputStyle = {
      boxSizing: 'border-box',
      width: '100%',
      padding: '6px 9px',
      font: 'inherit',
      color: 'inherit',
      background: 'transparent',
      border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
      borderRadius: 6,
      outline: 'none',
    };

    const buttonStyle = {
      font: 'inherit',
      color: 'inherit',
      background: 'transparent',
      border: '1px solid color-mix(in srgb, currentColor 32%, transparent)',
      borderRadius: 6,
      padding: '5px 12px',
      cursor: 'pointer',
    };

    const badgeStyle = {
      fontSize: 12,
      padding: '1px 8px',
      borderRadius: 999,
      border: '1px solid color-mix(in srgb, currentColor 26%, transparent)',
      opacity: 0.8,
      whiteSpace: 'nowrap',
    };

    /** A page that explains why the real form could not be built. */
    function makeDiagnosticPage(cause) {
      const detail = String((cause && cause.message) || cause);
      return function Diagnostic() {
        return h(
          'section',
          { style: { fontSize: 13, lineHeight: 1.6, padding: '4px 0 10px' } },
          h('div', { style: { fontWeight: 600, marginBottom: 4 } }, 'dsh-plugin-imom-mes 表单加载失败'),
          h('div', { style: { opacity: 0.85, wordBreak: 'break-word' } }, detail),
          h('div', { style: { opacity: 0.6, marginTop: 6 } }, '把这个信息发回给插件维护者；连接本身不受影响。'),
        );
      };
    }

    /**
     * Build the page component bound to one browser plugin context.
     * @param ctx - the browser plugin context (supplies `remote.credentials`).
     * @param t - the dictionary-bound translate function.
     * @returns the component the configuration slot renders.
     */
    function makePage(ctx, t) {
      /** Read the Host view of every managed reference, 64 at a time. */
      async function readStatus() {
        const chunks = [];
        for (let i = 0; i < REFS.length; i += DESCRIBE_CHUNK) chunks.push(REFS.slice(i, i + DESCRIBE_CHUNK));
        const answers = await Promise.all(chunks.map(function (chunk) { return ctx.remote.credentials.describe(chunk); }));
        const merged = {};
        for (const response of answers) {
          if (!response || !response.ok) {
            throw new Error((response && response.error && response.error.message) || t('unavailable'));
          }
          Object.assign(merged, response.value || {});
        }
        return merged;
      }

      return function ConnectionSection(props) {
        const [status, setStatus] = useState('loading');
        const [info, setInfo] = useState({});
        const [error, setError] = useState('');
        const [notice, setNotice] = useState('');
        const [busyRef, setBusyRef] = useState('');
        const [drafts, setDrafts] = useState({});

        const load = useCallback(async function () {
          try {
            setInfo(await readStatus());
            setStatus('ready');
            setError('');
          } catch (cause) {
            setStatus('error');
            setError(String((cause && cause.message) || cause));
          }
        }, []);

        useEffect(function () { void load(); }, [load]);

        const write = useCallback(async function (reference, value) {
          setBusyRef(reference);
          setNotice('');
          setError('');
          try {
            const response = value === undefined
              ? await ctx.remote.credentials.unset(reference)
              : await ctx.remote.credentials.set(reference, value);
            if (response && response.ok) {
              setDrafts(function (current) {
                const next = Object.assign({}, current);
                next[reference] = '';
                return next;
              });
              setNotice(value === undefined ? t('cleared') : t('saved'));
              await load();
            } else {
              setError((response && response.error && response.error.message) || t('failed'));
            }
          } catch (cause) {
            setError(String((cause && cause.message) || cause));
          } finally {
            setBusyRef('');
          }
        }, [load]);

        // The configuration slots only render the page view.
        if (props && props.view !== undefined && props.view !== 'page') return null;

        /** One row, built as an element — deliberately not a component. */
        function buildRow(param) {
          const reference = param.ref;
          const state = info[reference];
          const configured = Boolean(state && state.configured);
          const writable = !state || state.writable !== false;
          const draft = drafts[reference] || '';
          const busy = busyRef === reference;
          const trimmed = draft.trim();
          const idle = busy || trimmed.length === 0 || !writable;

          return h(
            'div',
            { key: reference, style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontWeight: 600 } }, t('label_' + reference)),
              h(
                'span',
                { style: badgeStyle },
                configured
                  ? t('configured') + (state && state.masked ? ' · ' + state.masked : '')
                  : t('notConfigured'),
              ),
              h('code', { style: { fontSize: 12, opacity: 0.55 } }, reference),
            ),
            h(
              'div',
              { style: { display: 'flex', gap: 8, alignItems: 'center' } },
              h('input', {
                type: param.secret === false ? 'text' : 'password',
                value: draft,
                disabled: !writable,
                autoComplete: 'off',
                spellCheck: false,
                placeholder: configured ? '••••••' : '',
                style: inputStyle,
                onChange: function (event) {
                  const value = event.target.value;
                  setDrafts(function (current) {
                    const next = Object.assign({}, current);
                    next[reference] = value;
                    return next;
                  });
                },
                onKeyDown: function (event) {
                  if (event.key === 'Enter' && trimmed.length > 0 && !busy) void write(reference, trimmed);
                },
              }),
              h(
                'button',
                {
                  type: 'button',
                  style: idle ? Object.assign({}, buttonStyle, { opacity: 0.5, cursor: 'default' }) : buttonStyle,
                  disabled: idle,
                  onClick: function () {
                    if (trimmed.length > 0) void write(reference, trimmed);
                  },
                },
                busy ? t('saving') : t('save'),
              ),
              configured
                ? h(
                    'button',
                    {
                      type: 'button',
                      style: busy ? Object.assign({}, buttonStyle, { opacity: 0.5 }) : buttonStyle,
                      disabled: busy,
                      onClick: function () { void write(reference, undefined); },
                    },
                    t('clear'),
                  )
                : null,
            ),
            h('div', { style: { fontSize: 12, opacity: 0.6, lineHeight: 1.5 } }, t('hint_' + reference)),
          );
        }

        // A row that throws must not blank the page: report it in place.
        let rows = [];
        let rowFailure = '';
        try {
          rows = PARAMS.map(buildRow);
        } catch (cause) {
          rowFailure = String((cause && cause.message) || cause);
        }

        const missing = REFS.filter(function (reference) { return !(info[reference] && info[reference].configured); });

        return h(
          'section',
          { style: { display: 'flex', flexDirection: 'column', gap: 16, padding: '2px 0 10px' } },
          h('div', { style: { fontSize: 13, opacity: 0.75, lineHeight: 1.6 } }, t('intro')),
          rowFailure.length > 0
            ? h('div', { style: { fontSize: 13, lineHeight: 1.6 } }, '表单渲染失败：' + rowFailure)
            : null,
          rows,
          missing.length === 0 || status === 'loading'
            ? null
            : h('div', { style: { fontSize: 12, opacity: 0.6, lineHeight: 1.6 } }, t('missingHint') + ' ' + missing.join(', ')),
          notice.length > 0 ? h('div', { style: { fontSize: 13, lineHeight: 1.5 } }, notice) : null,
          error.length > 0 ? h('div', { style: { fontSize: 13, lineHeight: 1.5, opacity: 0.9 } }, error) : null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h(
              'button',
              {
                type: 'button',
                style: status === 'loading' ? Object.assign({}, buttonStyle, { opacity: 0.5 }) : buttonStyle,
                disabled: status === 'loading',
                onClick: function () { void load(); },
              },
              t('reload'),
            ),
            h('span', { style: { fontSize: 12, opacity: 0.55 } }, t('liveHint')),
          ),
        );
      };
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.credentials'],
      apply(ctx) {
        let page;
        try {
          const t = ctx.locale.bind(NS);
          ctx.effect(function () { return ctx.locale.register(NS, { en: en, zh: zh }); }, 'imom-mes: dictionaries');
          page = makePage(ctx, t);
        } catch (cause) {
          page = makeDiagnosticPage(cause);
        }

        // Each registration reports its own outcome; one failing must not take
        // the other down, and the console line names which one worked.
        const register = function (slot, key) {
          try {
            ctx.slots.inject(slot, function () { return ctx.slots.register({ name: slot, key: key, locale: NS }, page); });
            return 'ok';
          } catch (cause) {
            return String((cause && cause.message) || cause);
          }
        };
        const bundleConfig = register('plugins.bundle.config', PACKAGE_NAME);
        const rowConfig = register('plugins.row.config', PACKAGE_NAME + '#imom-mes-bundle');
        console.info('[dsh-plugin-imom-mes] configuration form registered for', PACKAGE_NAME, bundleConfig, rowConfig);
      },
    };
  },
});
