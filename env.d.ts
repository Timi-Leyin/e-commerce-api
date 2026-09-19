export declare global{
    namespace NodeJS{
        interface ProcessEnv {
          NODE_ENV: string;
          DB_URL: string;
          DEV_PORT: number;
          JWT_SECRET: string;
          BACKEND_BASE_URL: string;
          FRONTEND_BASE_URL: string;

          GMAIL_USER:string,
          LOGDROP_API_KEY:string;
          UPLOADFLY_KEY:string;

          GOOGLE_CLIENT_ID:string;
          SESSION_SECRET:string;
          GOOGLE_REFRESH_TOKEN:string;
          GOOGLE_ACCESS_TOKEN:string;
          GOOGLE_CLIENT_SECRET:string;

          OPAY_MERCHANT_ID:string;
          OPAY_PUBLIC_KEY:string;
          OPAY_SECRET_KEY:string;
          OPAY_ENV?:string;
          OPAY_BASE_URL?:string;
          OPAY_SUCCESS_REDIRECT_URL?:string;
          OPAY_FAILED_REDIRECT_URL?:string;
        }
    }
}
