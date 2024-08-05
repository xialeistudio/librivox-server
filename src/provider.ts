import { parse } from 'node-html-parser';
const baseURL = 'https://librivox.org';

export interface Album {
    id: string;
    title: string;
    cover: string;
    author: { name: string };
    language: string;
    status?: string;
    type?: string;
    downloadURL?: string;
    size?: string;
    genre?: string;
    desc?: string;
    episode?: Episode[];
    duration?: number;
    catalogDate?: string;
}

export interface Episode {
    id: string;
    title: string;
    audioURL: string;
    duration: number;
}

export async function getAlbumList(category: string, page: number, type: string, order: string): Promise<Album[]> {
    const response = await fetch(`${baseURL}/search/get_results?search_category=${category}&search_page=${page}&search_order=${order}&project_type=${type}`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    if (response.status !== 200) {
        throw new Error('Failed to fetch search results');
    }
    const body: any = await response.json();
    if (body.status !== 'SUCCESS') {
        throw new Error('Failed to fetch search results');
    }
    if (!body.results) {
        throw new Error('No results found');
    }
    return parseAlbumList(body.results);
}


export function parseAlbumList(html: string): Album[] {
    const root = parse(html);
    const elements = root.querySelectorAll('.catalog-result');
    return elements.map((element) => {
        const url = element.querySelector('.result-data h3 a')!.getAttribute('href')!.trim();
        const id = url.split('/')[3].trim();
        const title = element.querySelector('.result-data h3')!.text.trim();
        const cover = element.querySelector('.book-cover img')!.getAttribute('src')!.trim();
        const author = element.querySelector('.book-author')!.text.trim().split('(')[0].trim();
        const meta = element.querySelector('.book-meta')!.text.trim().split(' | ');
        const status = meta[0] || '';
        const type = meta[1] || '';
        const language = meta[2] || '';
        const size = element.querySelector('.download-btn span')!.text.trim();
        const downloadURL = element.querySelector('.download-btn a')!.getAttribute('href')!.trim();
        return {
            id,
            title,
            cover,
            author: { name: author },
            status,
            type,
            language,
            size,
            downloadURL
        };
    });
}

export async function getAlbum(id: string): Promise<Album> {
    const url = `${baseURL}/${id}/`;
    const resp = await fetch(url, {
        method: 'GET'
    });
    if (resp.status !== 200) {
        throw new Error('Failed to fetch album');
    }
    const html = await resp.text();
    return parseAlbum(id, html);
}

export function parseAlbum(id: string, html: string): Album {
    const root = parse(html);
    const albumElement = root.querySelector('.page')!;
    const title = albumElement.querySelector('h1')!.text.trim();
    const cover = albumElement.querySelector('.book-page-book-cover img')!.getAttribute('src')!.trim();
    const author = albumElement.querySelector('.book-page-author')!.text.trim().split('(')[0].trim();
    const language = albumElement.querySelectorAll('.book-page-genre')[1]!.text.trim().split(':')[1].trim();
    const genre = albumElement.querySelectorAll('.book-page-genre')[0]!.text.trim().split(':')[1].trim();
    const desc = albumElement.querySelector('.description')!.text.trim();
    const episodeElements = root.querySelectorAll('.chapter-download tbody tr');
    const episodes = episodeElements.map((element) => {
        const columns = element.querySelectorAll('td');
        const id = columns[0].text.trim();
        const title = columns[1].text.trim();
        const audioURL = columns[1].querySelector('a')!.getAttribute('href')!.trim();
        const duration = parseDuration(columns[3].text.trim());
        return {
            id,
            title,
            audioURL,
            duration
        };
    });
    const detailElements = root.querySelectorAll('.product-details dd');
    const duration = parseDuration(detailElements[0].text.trim());
    const size = detailElements[1].text.trim();
    const catalogDate = detailElements[2].text.trim();
    return {
        id,
        title,
        cover,
        author: { name: author },
        language,
        genre,
        episode: episodes,
        desc,
        duration,
        size,
        catalogDate
    }
}

export function parseDuration(time: string): number {
    const parts = time.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
}