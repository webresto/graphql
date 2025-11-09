export interface Message {
  title: string
  type: "error" | "info" 
  id?: string
  message?: string
  deviceId: string
}

export interface Action {
  type: string
  data: object | string
  id?: string
  deviceId: string
}

export interface Response {
  message?: Message | undefined | null
  action?: Action | undefined | null
}