import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  createUser(name: string, email: string, hashed_password: string) {
    return this.prisma.user.create({
      data: { name, email, password: hashed_password },
      select: { id: true, name: true, email: true, created_at: true },
    })
  }
}
