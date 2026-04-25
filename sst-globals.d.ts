declare const $config: (value: {
  app: (input?: { stage?: string }) => Record<string, unknown>;
  run: () => Promise<Record<string, unknown>>;
}) => unknown;

declare const $app: {
  name: string;
  stage: string;
};

declare const $interpolate: (strings: TemplateStringsArray, ...values: unknown[]) => string;

declare const sst: any;
declare const aws: {
  getRegionOutput: () => { region: string };
};
