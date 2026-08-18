import { defineConfig } from 'orval';

export default defineConfig({
  glory: {
    input: {
      /* El snapshot versionado evita depender de un servidor manual durante codegen. */
      target: './src/api/openapi.json',
    },
    output: {
      target: './src/api/generated',
      client: 'react-query',
      mode: 'tags-split',
      override: {
        mutator: {
          path: './src/api/axios-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
