/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { extensions, TreeItem } from 'vscode';
import { azureResource, Account } from 'sqlops';

import { IAzureResourceNodeWithProviderId } from './interfaces';

export class AzureResourceService {
	private constructor() {
	}

	public static getInstance(): AzureResourceService {
		return AzureResourceService._instance;
	}

	public async listResourceProviderIds(): Promise<string[]> {
		await this.ensureResourceProvidersRegistered();

		return Object.keys(this._resourceProviders);
	}

	public registerResourceProvider(resourceProvider: azureResource.IAzureResourceProvider): void {
		this.doRegisterResourceProvider(resourceProvider);
	}

	public async getRootChildren(resourceProviderId: string, account: Account, subscription: azureResource.AzureResourceSubscription, tenatId: string): Promise<IAzureResourceNodeWithProviderId[]> {
		await this.ensureResourceProvidersRegistered();

		const resourceProvider = this._resourceProviders[resourceProviderId];
		if (!resourceProvider) {
			throw new Error(`Azure resource provider doesn't exist. Id: ${resourceProviderId}`);
		}

		const treeDataProvider = this._treeDataProviders[resourceProviderId];
		const children = await treeDataProvider.getChildren();

		return children.map((child) => <IAzureResourceNodeWithProviderId>{
			resourceProviderId: resourceProviderId,
			resourceNode: <azureResource.IAzureResourceNode>{
				account: account,
				subscription: subscription,
				tenantId: tenatId,
				treeItem: child.treeItem
			}
		});
	}

	public async getChildren(resourceProviderId: string, element: azureResource.IAzureResourceNode): Promise<IAzureResourceNodeWithProviderId[]> {
		await this.ensureResourceProvidersRegistered();

		const resourceProvider = this._resourceProviders[resourceProviderId];
		if (!resourceProvider) {
			throw new Error(`Azure resource provider doesn't exist. Id: ${resourceProviderId}`);
		}

		const treeDataProvider = this._treeDataProviders[resourceProviderId];
		const children = await treeDataProvider.getChildren(element);

		return children.map((child) => <IAzureResourceNodeWithProviderId>{
			resourceProviderId: resourceProviderId,
			resourceNode: child
		});
	}

	public async getTreeItem(resourceProviderId: string, element?: azureResource.IAzureResourceNode): Promise<TreeItem> {
		await this.ensureResourceProvidersRegistered();

		const resourceProvider = this._resourceProviders[resourceProviderId];
		if (!resourceProvider) {
			throw new Error(`Azure resource provider doesn't exist. Id: ${resourceProviderId}`);
		}

		const treeDataProvider = this._treeDataProviders[resourceProviderId];
		return treeDataProvider.getTreeItem(element);
	}

	private async ensureResourceProvidersRegistered(): Promise<void> {
		if (this._areResourceProvidersLoaded) {
			return;
		}

		for (const extension of extensions.all) {
			await extension.activate();

			const contributes = extension.packageJSON && extension.packageJSON.contributes;
			if (!contributes) {
				continue;
			}

			if (contributes['hasAzureResourceProviders']) {
				if (extension.exports && extension.exports.provideResources) {
					for (const resourceProvider of <azureResource.IAzureResourceProvider[]>extension.exports.provideResources()) {
						this.doRegisterResourceProvider(resourceProvider);
					}
				}
			}
		}

		this._areResourceProvidersLoaded = true;
	}

	private doRegisterResourceProvider(resourceProvider: azureResource.IAzureResourceProvider): void {
		this._resourceProviders[resourceProvider.providerId] = resourceProvider;
		this._treeDataProviders[resourceProvider.providerId] = resourceProvider.getTreeDataProvider();
	}

	private _areResourceProvidersLoaded: boolean = false;
	private _resourceProviders: { [resourceProviderId: string]: azureResource.IAzureResourceProvider } = {};
	private _treeDataProviders: { [resourceProviderId: string]: azureResource.IAzureResourceTreeDataProvider } = {};

	private static readonly _instance = new AzureResourceService();
}