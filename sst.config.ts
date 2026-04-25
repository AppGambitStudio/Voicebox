export default $config({
  app(input) {
    return {
      name: "xai-voice-agent-demo",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
    };
  },
  async run() {
    const table = new sst.aws.Dynamo("VoiceBookingTable", {
      fields: {
        pk: "string",
        sk: "string",
        gsi1pk: "string",
        gsi1sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      globalIndexes: {
        GSI1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
      },
    });

    const userPool = new sst.aws.CognitoUserPool("UserPool", {
      usernames: ["email"],
      domain: {
        prefix: $interpolate`${$app.name}-${$app.stage}-voice-booking`,
      },
      triggers: {
        postConfirmation: {
          handler: "packages/api/src/auth.postConfirmation",
          runtime: "nodejs22.x",
          link: [table],
        },
      },
      verify: {
        emailSubject: "Verify your Voicebox account",
        emailMessage: "Your Voicebox verification code is {####}",
      },
    });

    const localUrl = "http://localhost:5173";
    const deployedUrls = (process.env.APP_URL || "")
      .split(",")
      .map((url) => url.trim().replace(/\/+$/, ""))
      .filter(Boolean);
    const callbackUrls = Array.from(new Set([...deployedUrls, localUrl]));
    const userPoolClient = userPool.addClient("WebClient", {
      callbackUrls,
      providers: ["COGNITO"],
      transform: {
        client: (args: Record<string, unknown>) => {
          args.allowedOauthFlowsUserPoolClient = true;
          args.allowedOauthFlows = ["implicit"];
          args.allowedOauthScopes = ["openid", "email", "profile"];
          args.logoutUrls = callbackUrls;
        },
      },
    });

    const api = new sst.aws.ApiGatewayV2("Api", {
      cors: {
        allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
        allowOrigins: ["*"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
      link: [table],
    });

    const authorizer = api.addAuthorizer({
      name: "CognitoAuthorizer",
      jwt: {
        issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().region}.amazonaws.com/${userPool.id}`,
        audiences: [userPoolClient.id],
      },
    });

    const apiHandler = {
      handler: "packages/api/src/index.handler",
      runtime: "nodejs22.x",
      link: [table],
      environment: {
        XAI_API_KEY: process.env.XAI_API_KEY || "",
      },
    };

    api.route("GET /me", apiHandler, { auth: { jwt: { authorizer: authorizer.id } } });
    api.route("GET /dashboard", apiHandler, { auth: { jwt: { authorizer: authorizer.id } } });
    api.route("GET /calendar", apiHandler, { auth: { jwt: { authorizer: authorizer.id } } });
    api.route("GET /widgets", apiHandler, { auth: { jwt: { authorizer: authorizer.id } } });
    api.route("POST /widgets", apiHandler, { auth: { jwt: { authorizer: authorizer.id } } });
    api.route("GET /widgets/{widgetId}", apiHandler);
    api.route("POST /widgets/{widgetId}/session", apiHandler);
    api.route("GET /widgets/{widgetId}/slots", apiHandler);
    api.route("POST /widgets/{widgetId}/calls/{callId}/complete", apiHandler);
    api.route("POST /widgets/{widgetId}/bookings", apiHandler);
    api.route("GET /widgets/{widgetId}/bookings", apiHandler, { auth: { jwt: { authorizer: authorizer.id } } });

    const web = new sst.aws.StaticSite("Web", {
      path: "packages/web",
      build: {
        command: "npm run build",
        output: "dist",
      },
      errorPage: "index.html",
      dev: {
        command: "npm run web:dev",
        url: "http://localhost:5173",
      },
      environment: {
        VITE_API_URL: api.url,
        VITE_AUTH_DOMAIN: userPool.domainUrl || "",
        VITE_USER_POOL_CLIENT_ID: userPoolClient.id,
      },
    });

    return {
      api: api.url,
      web: web.url,
      userPoolId: userPool.id,
      userPoolClientId: userPoolClient.id,
      authDomain: userPool.domainUrl,
    };
  },
});
