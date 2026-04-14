import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { LoginDto } from './dto/login.dto'
import { AuthRepository } from './auth.repository'
import { RegisterDto } from './dto/register.dto'

const BCRYPT_SALT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.authRepository.findByEmail(dto.email)
    if (existing) throw new ConflictException('E-mail já cadastrado')

    const hashed_password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)

    const user = await this.authRepository.createUser(dto.name, dto.email, hashed_password)

    const access_token = this.signToken(user.id, user.email)
    return { access_token, user }
  }

  async login(dto: LoginDto) {
    const user = await this.authRepository.findByEmail(dto.email)
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
