module.exports =  ({ env }) => ({
	connection: {
		client: 'postgres',
		connection: {
		host: env('DATABASE_HOST', 'localhost'),
			port: env.int('DATABASE_PORT', 5432),
			database: env('DATABASE_NAME', 'sector_kids'),
			user: env('DATABASE_USERNAME', 'postgres'),
			password: env('DATABASE_PASSWORD', 'sector'),
			ssl: env.bool('DATABASE_SSL', false)
		}
	}
});
