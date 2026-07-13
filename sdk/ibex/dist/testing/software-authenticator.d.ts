import type { IbexWebAuthnProvider } from "../types";
export declare class SoftwareAuthenticator implements IbexWebAuthnProvider {
    private readonly credentialsPath;
    private credentials;
    private signCounter;
    constructor(credentialsPath?: string);
    private loadStore;
    private saveStore;
    create(options: PublicKeyCredentialCreationOptions): Promise<PublicKeyCredential>;
    get(options: PublicKeyCredentialRequestOptions): Promise<PublicKeyCredential>;
    private findCredential;
    private computePrfExtensionResults;
}
