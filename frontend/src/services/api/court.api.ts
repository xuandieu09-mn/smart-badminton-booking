import apiClient from './client';
import { Court, CourtAvailability } from '../../types/court.types';

export const fetchCourts = async (): Promise<Court[]> => {
	const { data } = await apiClient.get<Court[]>('/courts');
	return data;
};

export const fetchCourtAvailability = async (
	courtId: number,
	date: string,
): Promise<CourtAvailability> => {
	const { data } = await apiClient.get<CourtAvailability>(
		`/courts/${courtId}/availability`,
		{
			params: { date },
		},
	);
	return data;
};

export const courtApi = {
	fetchCourts,
	fetchCourtAvailability,
};
