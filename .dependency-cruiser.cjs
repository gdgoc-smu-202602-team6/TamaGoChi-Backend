/** Layer rules: api → domains → foundation, and no domain imports another domain. */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'foundation-knows-no-upper-layer',
      comment: 'foundation is below the domains and must not know them or the api layer',
      severity: 'error',
      from: { path: '^src/foundation/' },
      to: { path: '^src/(domains|api)/' },
    },
    {
      name: 'domains-know-no-api',
      severity: 'error',
      from: { path: '^src/domains/' },
      to: { path: '^src/api/' },
    },
    {
      name: 'no-domain-to-domain',
      comment: 'a domain reads and writes only its own tables and code; other domains are reached by id',
      severity: 'error',
      from: { path: '^src/domains/([^/]+)/' },
      to: { path: '^src/domains/([^/]+)/', pathNot: '^src/domains/$1/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^src/foundation/database/generated/' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
