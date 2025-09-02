export namespace main {
	
	export class ConnectionResult {
	    success: boolean;
	    message: string;
	    model?: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.model = source["model"];
	    }
	}
	export class StackConfig {
	    networkStack: boolean;
	    iotStack: boolean;
	    mediaStack: boolean;
	    components: Record<string, boolean>;
	
	    static createFrom(source: any = {}) {
	        return new StackConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.networkStack = source["networkStack"];
	        this.iotStack = source["iotStack"];
	        this.mediaStack = source["mediaStack"];
	        this.components = source["components"];
	    }
	}

}

