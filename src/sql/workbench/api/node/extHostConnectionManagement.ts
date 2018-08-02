/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { ExtHostConnectionManagementShape, SqlMainContext, MainThreadConnectionManagementShape } from 'sql/workbench/api/node/sqlExtHost.protocol';
import { IMainContext } from 'vs/workbench/api/node/extHost.protocol';
import { generateUuid } from 'vs/base/common/uuid';
import * as sqlops from 'sqlops';

export class ExtHostConnectionManagement extends ExtHostConnectionManagementShape {

	private _proxy: MainThreadConnectionManagementShape;
	private readonly _connectionDialogHandles = new Map<string, (connection: sqlops.connection.Connection) => void>();

	constructor(
		mainContext: IMainContext
	) {
		super();
		this._proxy = mainContext.getProxy(SqlMainContext.MainThreadConnectionManagement);
	}

	public $getActiveConnections(): Thenable<sqlops.connection.Connection[]> {
		return this._proxy.$getActiveConnections();
	}

	public $getCurrentConnection(): Thenable<sqlops.connection.Connection> {
		return this._proxy.$getCurrentConnection();
	}

	public $getCredentials(connectionId: string): Thenable<{ [name: string]: string }> {
		return this._proxy.$getCredentials(connectionId);
	}

	public $openConnectionDialog(callback: (connection: sqlops.connection.Connection) => void) {
		let handleId = `connectionDialog-${generateUuid()}`;
		this._connectionDialogHandles.set(handleId, callback);
		this._proxy.$openConnectionDialog(handleId);
	}

	public $onConnectionOpened(handleId: string, connection: sqlops.connection.Connection): void {
		if (this._connectionDialogHandles.has(handleId)) {
			let handler = this._connectionDialogHandles.get(handleId);
			handler(connection);
		}
	}
	public $listDatabases(connectionId: string): Thenable<string[]> {
		return this._proxy.$listDatabases(connectionId);
	}

	public $getConnectionString(connectionId: string, includePassword: boolean): Thenable<string> {
		return this._proxy.$getConnectionString(connectionId, includePassword);
	}

	public $getUriForConnection(connectionId: string): Thenable<string> {
		return this._proxy.$getUriForConnection(connectionId);
	}
}
