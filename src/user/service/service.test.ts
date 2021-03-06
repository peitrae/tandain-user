import User from './service';
import UserModel from '../model';
import TandainError from '@/utils/TandainError';

const mockCreate = jest.spyOn(UserModel, 'create');
const mockFindByEmail = jest.spyOn(UserModel, 'findByEmail');
const mockFindOne = jest.spyOn(UserModel, 'findOne');

describe('user/service', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('create', () => {
		it('should success create a user with name, email, and photoURL ', async () => {
			const mockUser = {
				name: 'test',
				email: 'test@test.com',
				photoURL: 'test.jpg',
			};

			mockCreate.mockResolvedValue({
				id: 1,
				...mockUser,
			});

			const user = await User.create(
				mockUser.name,
				mockUser.email,
				mockUser.photoURL
			);

			expect(user).toMatchObject({
				id: 1,
				...mockUser,
			});
		});

		it('should success create a user with name and email ', async () => {
			const mockUser = {
				name: 'test',
				email: 'test@test.com',
			};

			mockCreate.mockResolvedValue({
				id: 1,
				...mockUser,
				photoURL: undefined,
			});

			const user = await User.create(mockUser.name, mockUser.email);

			expect(user).toMatchObject({
				id: 1,
				...mockUser,
				photoURL: undefined,
			});
		});

		it('should throw an error when create duplicate user', async () => {
			const mockUser = {
				name: 'test',
				email: 'test@test.com',
				photoURL: 'test.jpg',
			};

			mockCreate.mockRejectedValue({
				message: 'Key (email)=(test@test.com) already exists',
			});

			await expect(
				User.create(mockUser.name, mockUser.email, mockUser.photoURL)
			).rejects.toThrow(TandainError);
		});
	});

	describe('findByEmail', () => {
		it('should return user if email exists', async () => {
			const mockUser = {
				id: 1,
				name: 'test',
				email: 'test@test.com',
				photoURL: 'test.jpg',
			};

			mockFindByEmail.mockResolvedValue(mockUser);

			const user = await User.findByEmail(mockUser.email);

			expect(user).toMatchObject(mockUser);
		});

		it('should return null if email does not exists', async () => {
			mockFindByEmail.mockResolvedValue(null);

			const user = await User.findByEmail('test@test.com');

			expect(user).toEqual(null);
		});

		it('should throw an error when PostgreSQL system is error', async () => {
			mockFindByEmail.mockRejectedValue({
				message: 'PostgreSQL system is error',
			});

			await expect(User.findByEmail('test@test.com')).rejects.toThrow(
				TandainError
			);
		});
	});

	describe('findOne', () => {
		it('should return user by id', async () => {
			const mockUser = {
				id: 1,
				name: 'test',
				email: 'test@test.com',
				photo_url: 'test.jpg',
			};

			mockFindOne.mockResolvedValue(mockUser);

			const user = await User.findOne({ id: mockUser.id });

			expect(user).toEqual({
				id: 1,
				name: 'test',
				email: 'test@test.com',
				photoURL: 'test.jpg',
			});
		});

		it('should return user by email', async () => {
			const mockUser = {
				id: 1,
				name: 'test',
				email: 'test@test.com',
				photo_url: 'test.jpg',
			};

			mockFindOne.mockResolvedValue(mockUser);

			const user = await User.findOne({ email: mockUser.email });

			expect(user).toEqual({
				id: 1,
				name: 'test',
				email: 'test@test.com',
				photoURL: 'test.jpg',
			});
		});

		it('should return null if user is not exists', async () => {
			mockFindOne.mockResolvedValue(null);

			const user = await User.findOne({ id: 2 });

			expect(user).toEqual(null);
		});

		it('should throw "Something went wrong" to handle unexpected Internal Error', async () => {
			mockFindOne.mockRejectedValue({
				code: 500,
				message: 'Unexpected Internal Error',
				location: 'user/findOne',
			});

			await expect(User.findOne({ id: 2 })).rejects.toThrowError(
				'Something went wrong'
			);
		});
	});
});
