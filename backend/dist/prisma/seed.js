"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
const prisma = new client_1.PrismaClient();
function hashPassword(password) {
    const salt = process.env.PASSWORD_SALT ?? 'salt';
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}
const DEFAULT_HOST_ID = 'a0000000-0000-0000-0000-000000000001';
const DEFAULT_HOST_TOKEN = 'local-dev-token';
async function main() {
    const email = 'demo@test.com';
    const password = 'demo';
    const passwordHash = hashPassword(password);
    await prisma.user.upsert({
        where: { email },
        update: { passwordHash },
        create: {
            email,
            passwordHash,
            role: 'admin',
        },
    });
    const hostTokenHash = crypto.createHash('sha256').update(DEFAULT_HOST_TOKEN).digest('hex');
    const agentUrl = process.env.DEFAULT_AGENT_URL ?? 'http://agent:9090';
    await prisma.host.upsert({
        where: { id: DEFAULT_HOST_ID },
        update: { tokenHash: hostTokenHash, name: 'local', agentUrl },
        create: {
            id: DEFAULT_HOST_ID,
            name: 'local',
            tokenHash: hostTokenHash,
            agentUrl,
        },
    });
    console.log('Seed done: user demo@test.com, host "local" (token: local-dev-token)');
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map