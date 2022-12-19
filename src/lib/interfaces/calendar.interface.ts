export enum NonWorkingDayType {
	WEEKEND = 1, // выходной
	HOLIDAY = 2, // праздник
}

export type NonWorkingDay = {
	date: string; // "2022-06-12"
	status: NonWorkingDayType; // 1
};

export type NonWorkingDays = NonWorkingDay[];
