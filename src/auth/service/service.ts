import { Auth as GoogleAuth, google } from 'googleapis';
import axios from 'axios';
import jwt from 'jsonwebtoken';

import User from '@/user/service';
import TandainError from '@/utils/TandainError';
import {
	GOOGLE_EXHANGE_TOKEN_ERROR,
	PARAM_CODE_INVALID,
	PARAM_REDIRECT_URI_INVALID,
} from '../errors';
import { GenerateJWTArgs } from './service.types';

class Auth {
	private static async exchangeOAuthCode(code: string, redirectUri: string) {
		try {
			const oauth2Client: GoogleAuth.OAuth2Client = new google.auth.OAuth2(
				process.env.GOOGLE_CLIENT_ID,
				process.env.GOOGLE_CLIENT_SECRET,
				redirectUri
			);

			const { tokens } = await oauth2Client.getToken(code);

			oauth2Client.setCredentials(tokens);

			return tokens;
		} catch (err) {
			const errors = {
				invalid_grant: {
					name: 'Invalid Grant',
					code: 400,
					message: PARAM_CODE_INVALID,
				},
				invalid_request: {
					name: 'Invalid Request',
					code: 400,
					message: PARAM_REDIRECT_URI_INVALID,
				},
				exhange_token_error: {
					name: 'Exchange Token Error',
					code: 500,
					message: GOOGLE_EXHANGE_TOKEN_ERROR,
				},
			};

			const getTokenErrorName: keyof typeof errors = err.response?.data.error;
			const error = errors[getTokenErrorName || 'exhange_token_error'];

			throw new TandainError(error.message, {
				name: error.name,
				code: error.code,
			});
		}
	}

	private static async getUserProfile(accessToken: string) {
		const url = 'https://people.googleapis.com/v1/people/me';
		const params = {
			personFields: encodeURI('names,photos,emailAddresses'),
		};

		try {
			const { data } = await axios.get(url, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
				params,
			});

			const userProfile = {
				name: data.names[0].displayName,
				email: data.emailAddresses[0].value,
				photoURL: data.photos[0].url,
			};

			return userProfile;
		} catch (err) {
			const error = err.response.data.error;

			throw new TandainError(error.message, {
				code: error.code,
				location: 'getUserProfile',
			});
		}
	}

	private static generateJWT({
		iss,
		exp,
		aud,
		userId,
		userName,
		userEmail,
	}: GenerateJWTArgs) {
		const payload = {
			iss, // Issuer of the token
			sub: userId, // Subject
			exp, // Expiry date
			aud, // Recipient of the token
			name: userName,
			email: userEmail,
		}; // Reference: https://datatracker.ietf.org/doc/html/rfc7519#section-4.1

		const secret = process.env.JWT_SECRET as string;

		return jwt.sign(payload, secret);
	}

	static async loginWithGoogle(code: string, redirectUri: string) {
		try {
			const { access_token, expiry_date } = await this.exchangeOAuthCode(
				code,
				redirectUri
			);

			const userProfile = await this.getUserProfile(access_token as string);
			const { name, email, photoURL } = userProfile;

			let user = await User.findByEmail(email);

			if (!user) {
				user = await User.create(name, email, photoURL);
			}

			const idToken = this.generateJWT({
				iss: process.env.HOST,
				exp: expiry_date,
				aud: process.env.HOST,
				userId: user.id,
				userName: user.name,
				userEmail: user.email,
			});

			return { idToken, message: 'Logged in successfully' };
		} catch (err) {
			throw new TandainError(err.message, {
				name: err.name,
				code: err.code,
				location: err.location,
			});
		}
	}
}

export default Auth;
