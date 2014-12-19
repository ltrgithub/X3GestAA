using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.StorageVolumeHelper.Model
{
    public class StorageVolumeModel
    {
        [JsonProperty("code")]
        public String code;

        [JsonProperty("$uuid")]
        public String uuid;
    }
}
