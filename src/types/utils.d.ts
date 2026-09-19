// UTILS > SEND EMAIL
export interface SendEmailTypes {
  to: string;
  subject: string;
  data: any;
  path: string;
}

export type Currency = "NGN" | "USD"


export interface sendNotificationType{
  type: string,
  title:string,
  body:string,
  ref?:any,
  to:string
}