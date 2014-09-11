using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Common
{
    public class PublishDocumentModel
    {
        [JsonProperty("$etag")]
        public int etag;

        [JsonProperty("$uuid")]
        public string uuid;

        [JsonProperty("description")]
        public string description;

        [JsonProperty("volume")]
        public SyracuseUuidModel storageVolume;

        [JsonProperty("owner")]
        public SyracuseUuidModel owner;

        [JsonProperty("$url")]
        public string url;

        [JsonProperty("teams")]
        public List<SyracuseUuidModel> teams;

        [JsonProperty("tags")]
        public List<SyracuseUuidModel> tags;
    }
}
