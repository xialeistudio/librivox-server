import { ApolloServer } from '@apollo/server';
import { startServerAndCreateCloudflareWorkersHandler } from '@as-integrations/cloudflare-workers';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { getAlbumList, getAlbum } from './provider';

const typeDefs = `#graphql
	type Album {
		id: ID!
		title: String
		cover: String
		author: Author
		status: String
		type: String
		language: String
		size: String
		downloadURL: String
		genre: String
		episode: [Episode]
		desc: String
		duration: Int
		catalogDate: String
	}
	type Episode {
		id: String
		title: String
		audioURL: String
		duration: Int
	}
	type Author {
		name: String
	}
	enum Category {
		TITLE
	}
	enum Order {
		ALPHA
		CATALOG_DATE
	}
	enum Type {
		EITHER
		SOLO
		GROUP
	}
	type Query {
		albums(page:Int=1,category:Category=TITLE,type:Type=EITHER,order:Order=CATALOG_DATE):[Album]
		album(id:ID!):Album
	}
`;

const resolvers = {
	Query: {
		albums: async (_: any, { page, category, type, order }: { page: number, category: string, type: string, order: string }) => {
			category = category.toLowerCase();
			type = type.toLowerCase();
			order = order.toLowerCase();
			const albums = await getAlbumList(category, page, type, order);
			return albums;
		},
		album: async (_: any, { id }: { id: string }) => {
			const album = await getAlbum(id);
			return album;
		}
	}
}

interface Context {
	token: string
}

const server = new ApolloServer<Context>({
	typeDefs,
	resolvers,
	introspection: true,
	plugins: [
		ApolloServerPluginLandingPageLocalDefault({ footer: false }),
	],
});

export interface Env {
	// ...
}

export default {
	fetch: startServerAndCreateCloudflareWorkersHandler<Env, Context>(server, {
		context: async ({ env, request, ctx }) => {
			return { token: 'secret' };
		},
	}),
};