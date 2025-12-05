import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../test/test-helpers';

describe('WalletController', () => {
  let controller: WalletController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
