using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using CommonDataHelper.PublisherHelper.Model.Common;

namespace CommonDataHelper.EndpointHelper.Model
{
    public class EndpointModel
    {
        [JsonProperty("application")]
        public string application;

        [JsonProperty("contract")]
        public string contract;

        [JsonProperty("dataset")]
        public string dataset;
    }
}
