type AuthData = {
    userId: string;
    deviceId: string;
    sessionId: string;
};
export declare class JWTAuth {
    static sign(authData: AuthData): string;
    static verify(token: string): Promise<AuthData>;
}
export {};
