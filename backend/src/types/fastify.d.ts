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
    // Quién está haciendo la petición. Hace falta para dejar constancia de
    // quién registró un retiro o quién editó una marcación: sin esto, el
    // historial dice qué pasó pero no quién lo hizo.
    usuarioId?: string;
    usuarioNombre?: string;
  }
}
