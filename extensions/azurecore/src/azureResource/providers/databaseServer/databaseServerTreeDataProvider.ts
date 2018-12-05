/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { azureResource, AzureResource } from 'sqlops';
import { TreeItem, TreeItemCollapsibleState, ExtensionContext } from 'vscode';
import { TokenCredentials } from 'ms-rest';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import { IAzureResourceDatabaseServerService, IAzureResourceDatabaseServerNode } from './interfaces';
import { AzureResourceDatabaseServer } from './models';
import { AzureResourceItemType } from '../../../azureResource/constants';
import { ApiWrapper } from '../../../apiWrapper';

export class AzureResourceDatabaseServerTreeDataProvider implements azureResource.IAzureResourceTreeDataProvider {
	public constructor(
		databaseServerService: IAzureResourceDatabaseServerService,
		apiWrapper: ApiWrapper,
		extensionContext: ExtensionContext
	) {
		this._databaseServerService = databaseServerService;
		this._apiWrapper = apiWrapper;
		this._extensionContext = extensionContext;
	}

	public getTreeItem(element: azureResource.IAzureResourceNode): TreeItem | Thenable<TreeItem> {
		return element.treeItem;
	}

	public async getChildren(element?: azureResource.IAzureResourceNode): Promise<azureResource.IAzureResourceNode[]> {
		if (!element) {
			return [this.createContainerNode()];
		}

		const tokens = await this._apiWrapper.getSecurityToken(element.account, AzureResource.ResourceManagement);
		const credential = new TokenCredentials(tokens[element.tenantId].token, tokens[element.tenantId].tokenType);

		const databaseServers: AzureResourceDatabaseServer[] = (await this._databaseServerService.getDatabaseServers(element.subscription, credential)) || <AzureResourceDatabaseServer[]>[];

		return databaseServers.map((databaseServer) => <IAzureResourceDatabaseServerNode>{
			account: element.account,
			subscription: element.subscription,
			tenantId: element.tenantId,
			databaseServer: databaseServer,
			treeItem: {
				id: `databaseServer_${databaseServer.name}`,
				label: databaseServer.name,
				iconPath: {
					dark: this._extensionContext.asAbsolutePath('resources/dark/sql_server_inverse.svg'),
					light: this._extensionContext.asAbsolutePath('resources/light/sql_server.svg')
				},
				collapsibleState: TreeItemCollapsibleState.None,
				contextValue: AzureResourceItemType.databaseServer
			}
		});
	}

	private createContainerNode(): azureResource.IAzureResourceNode {
		return {
			account: undefined,
			subscription: undefined,
			tenantId: undefined,
			treeItem: {
				id: AzureResourceDatabaseServerTreeDataProvider.containerId,
				label: AzureResourceDatabaseServerTreeDataProvider.containerLabel,
				iconPath: {
					dark: this._extensionContext.asAbsolutePath('resources/dark/folder_inverse.svg'),
					light: this._extensionContext.asAbsolutePath('resources/light/folder.svg')
				},
				collapsibleState: TreeItemCollapsibleState.Collapsed,
				contextValue: AzureResourceItemType.databaseServerContainer
			}
		};
	}

	private _databaseServerService: IAzureResourceDatabaseServerService = undefined;
	private _apiWrapper: ApiWrapper = undefined;
	private _extensionContext: ExtensionContext = undefined;

	private static readonly idPrefix = 'azure.resource.providers.databaseServer.treeDataProvider';

	private static readonly containerId = `${AzureResourceDatabaseServerTreeDataProvider.idPrefix}.databaseServerContainer`;
	private static readonly containerLabel = localize(`${AzureResourceDatabaseServerTreeDataProvider.idPrefix}.databaseServerContainerLabel`, 'SQL Servers');
}