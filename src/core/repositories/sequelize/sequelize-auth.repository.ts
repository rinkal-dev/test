/**
 * ============================================
 * SEQUELIZE AUTH REPOSITORIES
 * PersonalAccessTokens, PasswordResets, SocialLogins
 * ============================================
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  PERSONAL_ACCESS_TOKENS_REPOSITORY,
  PASSWORD_RESETS_REPOSITORY,
  SOCIAL_LOGINS_REPOSITORY,
} from '../../../config/constants';
import { PersonalAccessTokens } from '../../../models/PersonalAccessTokens';
import { PasswordResets } from '../../../models/PasswordResets';
import { SocialLogins } from '../../../models/SocialLogins';
import { FindOptions, CountOptions, FindAndCountResult } from '../base.repository.interface';
import {
  IPersonalAccessTokenRepository, PersonalAccessTokenEntity, CreatePersonalAccessTokenData, UpdatePersonalAccessTokenData,
  IPasswordResetRepository, PasswordResetEntity, CreatePasswordResetData, UpdatePasswordResetData,
  ISocialLoginRepository, SocialLoginEntity, CreateSocialLoginData, UpdateSocialLoginData,
} from '../auth.repository.interface';

// ============================================
// PERSONAL ACCESS TOKEN REPOSITORY
// ============================================
@Injectable()
export class SequelizePersonalAccessTokenRepository implements IPersonalAccessTokenRepository {
  constructor(@Inject(PERSONAL_ACCESS_TOKENS_REPOSITORY) private tokensModel: typeof PersonalAccessTokens) {}

  private toEntity(model: PersonalAccessTokens | null): PersonalAccessTokenEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as PersonalAccessTokenEntity;
  }

  private toEntities(models: PersonalAccessTokens[]): PersonalAccessTokenEntity[] {
    return models.map((m) => this.toEntity(m) as PersonalAccessTokenEntity);
  }

  async create(data: CreatePersonalAccessTokenData): Promise<PersonalAccessTokenEntity> {
    const model = await this.tokensModel.create(data as any);
    return this.toEntity(model) as PersonalAccessTokenEntity;
  }

  async findAll(options?: FindOptions): Promise<PersonalAccessTokenEntity[]> {
    const models = await this.tokensModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<PersonalAccessTokenEntity>> {
    const result = await this.tokensModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<PersonalAccessTokenEntity | null> {
    const model = await this.tokensModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<PersonalAccessTokenEntity | null> {
    return null; // Tokens don't have uuid
  }

  async update(uuid: string, data: UpdatePersonalAccessTokenData): Promise<[number]> {
    return await this.tokensModel.update({ ...data, updated_at: new Date() }, { where: { id: uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.tokensModel.destroy({ where: { id: uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.tokensModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.tokensModel.count({ where: { id: uuid } })) > 0;
  }

  async findByToken(token: string): Promise<PersonalAccessTokenEntity | null> {
    const model = await this.tokensModel.findOne({ where: { token } });
    return this.toEntity(model);
  }

  async deleteByTokenableId(tokenableType: string, tokenableId: number): Promise<number> {
    return await this.tokensModel.destroy({
      where: { tokenable_type: tokenableType, tokenable_id: tokenableId },
    });
  }

  async deleteExpiredTokens(tokenableType: string, tokenableId: number): Promise<number> {
    return await this.tokensModel.destroy({
      where: {
        tokenable_type: tokenableType,
        tokenable_id: tokenableId,
        access_token_expired_at: { [Op.lt]: new Date() },
      },
    });
  }

  async countActiveTokens(tokenableType: string, tokenableId: number): Promise<number> {
    const result = await this.tokensModel.count({
      where: {
        tokenable_type: tokenableType,
        tokenable_id: tokenableId,
        [Op.or]: [
          { access_token_expired_at: null },
          { access_token_expired_at: { [Op.gt]: new Date() } },
        ],
      },
    });
    return typeof result === 'number' ? result : (result as any[]).length;
  }
}

// ============================================
// PASSWORD RESET REPOSITORY
// ============================================
@Injectable()
export class SequelizePasswordResetRepository implements IPasswordResetRepository {
  constructor(@Inject(PASSWORD_RESETS_REPOSITORY) private passwordResetsModel: typeof PasswordResets) {}

  private toEntity(model: PasswordResets | null): PasswordResetEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as PasswordResetEntity;
  }

  private toEntities(models: PasswordResets[]): PasswordResetEntity[] {
    return models.map((m) => this.toEntity(m) as PasswordResetEntity);
  }

  async create(data: CreatePasswordResetData): Promise<PasswordResetEntity> {
    const model = await this.passwordResetsModel.create(data as any);
    return this.toEntity(model) as PasswordResetEntity;
  }

  async findAll(options?: FindOptions): Promise<PasswordResetEntity[]> {
    const models = await this.passwordResetsModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<PasswordResetEntity>> {
    const result = await this.passwordResetsModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<PasswordResetEntity | null> {
    const model = await this.passwordResetsModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<PasswordResetEntity | null> {
    return null;
  }

  async update(uuid: string, data: UpdatePasswordResetData): Promise<[number]> {
    return await this.passwordResetsModel.update(data as any, { where: { email: uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.passwordResetsModel.destroy({ where: { email: uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.passwordResetsModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.passwordResetsModel.count({ where: { email: uuid } })) > 0;
  }

  async findByEmail(email: string): Promise<PasswordResetEntity | null> {
    const model = await this.passwordResetsModel.findOne({ where: { email } });
    return this.toEntity(model);
  }

  async findByToken(token: string): Promise<PasswordResetEntity | null> {
    const model = await this.passwordResetsModel.findOne({ where: { token } });
    return this.toEntity(model);
  }

  async deleteByEmail(email: string): Promise<number> {
    return await this.passwordResetsModel.destroy({ where: { email } });
  }
}

// ============================================
// SOCIAL LOGIN REPOSITORY
// ============================================
@Injectable()
export class SequelizeSocialLoginRepository implements ISocialLoginRepository {
  constructor(@Inject(SOCIAL_LOGINS_REPOSITORY) private socialLoginsModel: typeof SocialLogins) {}

  private toEntity(model: SocialLogins | null): SocialLoginEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as SocialLoginEntity;
  }

  private toEntities(models: SocialLogins[]): SocialLoginEntity[] {
    return models.map((m) => this.toEntity(m) as SocialLoginEntity);
  }

  async create(data: CreateSocialLoginData): Promise<SocialLoginEntity> {
    const model = await this.socialLoginsModel.create(data as any);
    return this.toEntity(model) as SocialLoginEntity;
  }

  async findAll(options?: FindOptions): Promise<SocialLoginEntity[]> {
    const models = await this.socialLoginsModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<SocialLoginEntity>> {
    const result = await this.socialLoginsModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<SocialLoginEntity | null> {
    const model = await this.socialLoginsModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<SocialLoginEntity | null> {
    return null;
  }

  async update(uuid: string, data: UpdateSocialLoginData): Promise<[number]> {
    return await this.socialLoginsModel.update(data as any, { where: { id: uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.socialLoginsModel.destroy({ where: { id: uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.socialLoginsModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.socialLoginsModel.count({ where: { id: uuid } })) > 0;
  }

  async findOrCreate(data: CreateSocialLoginData): Promise<[SocialLoginEntity, boolean]> {
    const [model, created] = await this.socialLoginsModel.findOrCreate({
      where: { provider: data.provider, provider_id: data.provider_id },
      defaults: data as any,
    });
    return [this.toEntity(model) as SocialLoginEntity, created];
  }

  async findByProviderAndId(provider: string, providerId: string): Promise<SocialLoginEntity | null> {
    const model = await this.socialLoginsModel.findOne({
      where: { provider, provider_id: providerId },
    });
    return this.toEntity(model);
  }
}
