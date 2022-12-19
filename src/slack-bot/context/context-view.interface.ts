import {
	Method,
	ViewsOpenArguments,
	ViewsOpenResponse,
	ViewsPublishArguments,
	ViewsPublishResponse,
	ViewsPushArguments,
	ViewsPushResponse,
	ViewsUpdateArguments,
	ViewsUpdateResponse,
} from '@slack/web-api';

export interface ContextViewsInterface {
	open: Method<ViewsOpenArguments, ViewsOpenResponse>;
	publish: Method<ViewsPublishArguments, ViewsPublishResponse>;
	push: Method<ViewsPushArguments, ViewsPushResponse>;
	update: Method<ViewsUpdateArguments, ViewsUpdateResponse>;
}
