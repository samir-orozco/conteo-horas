import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireEmpresa(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireAfiliado(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
  interface FastifyRequest {
    empresaId?: string;
    afiliadoId?: string;
  }
}
