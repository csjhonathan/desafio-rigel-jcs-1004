import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

const BCRYPT_SALT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('E-mail já cadastrado')

    const hashed_password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)

    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashed_password },
      select: { id: true, name: true, email: true, created_at: true },
    })

    const access_token = this.signToken(user.id, user.email)
    return { access_token, user }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new UnauthorizedException('Credenciais inválidas')

    const password_valid = await bcrypt.compare(dto.password, user.password)
    if (!password_valid) throw new UnauthorizedException('Credenciais inválidas')

    const access_token = this.signToken(user.id, user.email)
    return {
      access_token,
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
    }
  }

  private signToken(user_id: string, email: string): string {
    return this.jwt.sign({ sub: user_id, email })
  }
}
