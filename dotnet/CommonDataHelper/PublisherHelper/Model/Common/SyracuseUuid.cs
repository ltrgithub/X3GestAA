﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Common
{
    public class SyracuseUuid
    {
        [JsonProperty("$uuid")]
        public string uuid;
    }
}
