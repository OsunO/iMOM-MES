/**
 * Host half of the MOM MES connector bundle.
 *
 * Every connection value lives either in the credential store or in the bundle
 * patch, and the browser half edits the credential side through the Host
 * `remote.credentials` namespace. This half therefore registers nothing: it
 * exists so the bundle owns a Loader row that the Client manifest can hang from.
 */
export function apply() {}
