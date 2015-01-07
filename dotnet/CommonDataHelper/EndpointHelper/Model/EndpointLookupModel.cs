using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.EndpointHelper.Model
{
    public class EndpointLookupModel
    {
        [JsonProperty("description")]
        public String description;

        [JsonProperty("$uuid")]
        public String uuid;
    }
}
