using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using CommonDataHelper.PublisherHelper.Model.Common;

namespace CommonDataHelper.EndpointHelper.Model
{
    public class EndpointRequestModel
    {
        [JsonProperty("$etag")]
        public int etag;

        [JsonProperty("$uuid")]
        public string uuid;

        [JsonProperty("$url")]
        public string url;

        [JsonProperty("endpoint")]
        public SyracuseUuidModel endpointUuid;
    }
}
